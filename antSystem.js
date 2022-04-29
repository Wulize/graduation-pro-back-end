const Router = require("koa-router");

class AntSystem {
    //初始化
    // 1.初始化节点与路径，并根据节点与路径生成图
    // 2.初始化信息素，每条路径上的信息素都相等
    // 3.随机化蚂蚁，使其分布于某一节点中，也可以不使用随机化。每个蚂蚁都会存储走过的路径与剩下可走的路径
    // 蚂蚁抉择
    // 对于每个蚂蚁，会从接下来可走的路径中进行选择，选择按照概率进行。
    // 选择其中一条路径的计算公式为
    // p = 所选路径信息素*能见度 / 求和(每个路径的信息素*每个路径的能见度)
    // 其中能见度为:
    // 能见度 = 1/路径距离
    // 选择其中一条路径后将该路径从未走路径加入到已走路径
    // 信息素更新
    // 在每个蚂蚁都走完后将更新信息素
    // 每个路径上的信息素 = 原信息素*信息素挥发率 + 求和(1/每个经过该路径上的蚂蚁其行走总路径长度)
    // 其中的信息素挥发率为0到1之间的常数，如果过低则难以收敛，过高则容易陷入局部最优解
    // 终止条件
    // 如果某一路径信息素要明显大于其余所有边的信息素的和则可以认定该路径满足收敛条件。
    // 如果循环的次数超出最大则判断收敛失败
    constructor(cityArr) {
            this.cityArr = cityArr;
            this.cityNum = cityArr.length; //景点数量
            this.antNum = this.cityNum * 2 + 5; // 蚂蚁数量
            this.Q = 50; // 常数
            this.iter = 1; // 从1开始
            this.iter_max = 100; //循环300次
            this.rho = 0.2; //信息素挥发因子，经验[0.2，0.5]之间
            this.alpha = 1; //信息素的重要性，[1,4]，过大的话导致过早陷入局部最优点
            this.beta = 5; //启发函数因子，[3,5]
            this.distance = new Array(this.cityNum).fill(new Array()); //景点距离数组
            this.heu_f = new Array(this.cityNum).fill(new Array(this.cityNum)) //启发函数
            this.pheromone_table = new Array(this.cityNum).fill(0).map(item => new Array(this.cityNum).fill(1)) //信息素浓度数组  
            this.get_dist();
            this.path_table = new Array(); //记录每只蚂蚁选择的路径
            this.router_best = new Array(this.iter_max); //记录每轮选择的最优路径
            this.length_best = new Array(this.iter_max); //记录每只蚂蚁选的的最短路线
            // console.log('距离矩阵：', this.distance);
            // console.log('启发函数：', this.heu_f);
            // console.log('初始信息素矩阵', this.pheromone_table);
            // console.log('------------------');
            this.ant_traversal();
        }
        /* 计算城市之间的距离,同时初始化起始的信息素浓度 */
    get_dist() {
            for (let i = 0; i < this.cityNum; i++) { //  初始化距离数组
                let distance = [],
                    init_Pheromone = [];
                for (let j = 0; j < this.cityNum; j++) {
                    let dist = CoolWPDistance(this.cityArr[i].lng, this.cityArr[i].lat, this.cityArr[j].lng, this.cityArr[j].lat)
                    distance.push(dist);
                    init_Pheromone.push(1.0 / dist)
                }
                this.distance[i] = distance;
                this.heu_f[i] = init_Pheromone;
            }
        }
        /* 更新信息素 */
    update_pheromone() {}
        /* 每只蚂蚁遍历城市，记录所走的路径 */
    ant_traversal() {
        while (this.iter <= this.iter_max) {
            //遍历城市，记录相关的的路径、长度、更新信息素
            this.path_table = [];
            let length = new Array(), //计算各个蚂蚁的路径长度
                pheromone_sum = 0, //全部的信息素浓度之和
                best_router_pheromone; //一直最短路线的信息素浓度值和
            for (let i = 0; i < this.antNum; i++) {
                // console.log('------------------');
                let p = [], // 记录各个可访问城市的概率
                    sum = 0,
                    allow = [], //剩下的可访问的城市
                    preSum = [], //用来计算前n项和，方便后续的轮盘赌实现
                    visited = [0]; //记录已经访问的地点，默认以第一个城市为起点
                for (let i = 1; i < this.cityNum; i++) allow.push(i);
                for (let i = 1; i < this.cityNum; i++) {
                    p = [];
                    allow.forEach((item, index) => {
                            p[index] = (this.pheromone_table[visited[visited.length - 1]][item] ** this.alpha) *
                                (this.heu_f[visited[visited.length - 1]][item] ** this.beta);
                        })
                        // console.log('访问过：', visited, '可访问：', allow);
                    sum = p.reduce((pre, item) => item + pre, 0);
                    p.forEach((value, index) => {
                        p[index] = value / sum;
                    })
                    preSum = [p[0]];
                    for (let i = 1; i < p.length; i++) {
                        preSum[i] = preSum[i - 1] + p[i];
                    }
                    let ran = Math.random(),
                        target_index,
                        target;
                    // console.log('不同路径选择的概率：', p, preSum);
                    // console.log('生成的随机数', ran);
                    // 采用轮盘赌的方式来选择路径
                    for (let i = 0; i < preSum.length; i++) {
                        if (preSum[i] === 1) {
                            target_index = i;
                            break;
                        } else if (i === 0 && preSum[i] >= ran) {
                            target_index = 0;
                            break;
                        } else if (preSum[i] < ran) continue;
                        else { target_index = i; break }
                    }
                    target = allow[target_index];
                    // console.log('产生下一个访问地址的下标', target_index);
                    allow.splice(target_index, 1);
                    visited.push(target);
                }
                this.path_table.push(visited);

            }
            //利用path_table记录下所有的路径 
            let router_length,
                min_length = Infinity,
                best_router;
            for (let i = 0; i < this.antNum; i++) {
                router_length = add(this.path_table[i], this.distance)
                length.push(router_length);
                min_length = Math.min(router_length, min_length);
                best_router = min_length === router_length ? this.path_table[i] : best_router;
            }
            this.router_best[this.iter - 1] = best_router;
            this.length_best[this.iter - 1] = min_length;
            //更新信息素的浓度
            // 信息素的衰减
            // pheromone_sum 当前的信息素浓度之和
            pheromone_sum = 0;
            for (let i = 0; i < this.cityNum; i++) {
                for (let j = 0; j < this.cityNum; j++) {
                    this.pheromone_table[i][j] = this.pheromone_table[i][j] * (1 - this.rho);
                }
            }
            for (let i = 0; i < this.path_table.length; i++) {
                for (let j = 0; j < this.cityNum - 1; j++) {
                    this.pheromone_table[this.path_table[i][j]][this.path_table[i][j + 1]] += this.Q / length[i];
                    this.pheromone_table[this.path_table[i][j + 1]][this.path_table[i][j]] += this.Q / length[i];
                }
            }
            // 求全部的信息素之和
            for (let i = 0; i < this.pheromone_table.length; i++) {
                for (let j = 0; j < this.pheromone_table[0].length; j++) {
                    pheromone_sum += i !== j ? this.pheromone_table[i][j] : 0;
                }
            }
            best_router_pheromone = 0;
            for (let i = 0; i < this.cityNum - 1; i++) {
                best_router_pheromone += this.pheromone_table[best_router[i]][best_router[i + 1]];
            }
            console.log('路径信息：', this.path_table);
            console.log(`${this.iter}次最短路线信息素浓度占比：`, best_router_pheromone * 2.0 / pheromone_sum);
            // iter++
            this.iter++;
        }
        // console.log('更新后的信息素：', this.pheromone_table);
    }

}
/* 转换弧度*/
function getRad(d) {
    let PI = Math.PI;
    return d * PI / 180.0;
}

/*根据经纬度计算两点间距离 */
function CoolWPDistance(lng1, lat1, lng2, lat2) {
    if (lng1 === lng2 && lat1 === lat2) return 0;
    let f = getRad((lat1 + lat2) / 2);
    let g = getRad((lat1 - lat2) / 2);
    let l = getRad((lng1 - lng2) / 2);
    let sg = Math.sin(g);
    let sl = Math.sin(l);
    let sf = Math.sin(f);
    let s, c, w, r, d, h1, h2;
    let a = 6378137.0; //The Radius of eath in meter.
    let fl = 1 / 298.257;
    sg = sg * sg;
    sl = sl * sl;
    sf = sf * sf;
    s = sg * (1 - sl) + (1 - sf) * sl;
    c = (1 - sg) * (1 - sl) + sf * sl;
    w = Math.atan(Math.sqrt(s / c));
    r = Math.sqrt(s * c) / w;
    d = 2 * w * a;
    h1 = (3 * r - 1) / 2 / c;
    h2 = (3 * r + 1) / 2 / s;
    s = d * (1 + fl * (h1 * sf * (1 - sg) - h2 * (1 - sf) * sg));
    s = s.toFixed(2);
    // s = s.toFixed(2);//指定小数点后的位数。
    return s;
}

/* 数组求和 */
function add(index, distance) {
    let sum = 0;
    for (let i = 0; i < (index || []).length - 1; i++) {
        sum += parseFloat(distance[index[i]][index[i + 1]]);
    }
    return sum;
}
module.exports = AntSystem
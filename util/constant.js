// 存放公共函数
function createRamdonNum() {
    let Num = "";
    for (let i = 0; i < 6; i++) {
        Num += Math.floor(Math.random() * 10);
    }
    return Num;
}
// 知道对象的值==》来获取对应的key的方法
function findKey(value, obj) {
    let compare = (a, b) => a === b
    return Object.keys(obj).find(k => compare(obj[k], value))
}
module.exports = {
    createRamdonNum,
    findKey
}
const router = require('koa-router')()
const { insert, getdata, deleteData } = require('../dao/dao')
const Koa = require('koa')
const tool = require('../util/constant')
const websockify = require('koa-websocket') //cg
const app = websockify(new Koa()); //cg
let ctxs = {}; //cg
app.listen(3001); //cg
router.prefix('/chat')

app.ws.use((ctx, next) => {
    /* 每打开一个连接就往 上线文数组中 添加一个上下文 */
    let { id } = ctx.query;
    ctxs[id] = ctx;
    console.log(id + '  connect');
    ctx.websocket.on("message", (message) => {
        let data = JSON.parse(message); //处理数据
        console.log(data);
        if (data.type == "chat") { //聊天模式 分配对应数据
            let info = data;
            if (!ctxs[data.receiver]) {
                ctx.websocket.send(JSON.stringify({
                    type: "chat",
                    send_time: new Date(),
                    send_msg: '对方未上线',
                    send_id: data.receiver,
                    send_name: '机器人代发',
                    receiver: data.send_id,
                }));
            } else {
                ctxs[data.receiver].websocket.send(JSON.stringify(info));
            }
        }
    });
    ctx.websocket.on("close", (message) => {
        /* 连接关闭时, 清理 上下文数组, 防止报错 */
        let key = tool.findKey(ctx, ctxs);
        console.log(key + "关闭了链接");
        delete ctxs[key];
    });
});

router.get('/json', async(ctx, next) => {
        ctx.body = {
            title: 'websocket json'
        }
    })
    // 聊天模块相关接口
router.get('/getFriendList', async(ctx, next) => {
    let userName = ctx.query.userName;
    let res = await getdata('friendIList', { userName });
    console.log(res[0])
    const friendList = (res[0] || {}).friendList || ['请先添加好友']
    ctx.body = { friendList };
})



module.exports = router
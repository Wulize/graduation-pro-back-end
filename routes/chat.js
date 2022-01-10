const router = require('koa-router')()
const { insert, getdata, deleteData } = require('../dao/dao')
const Koa = require('koa')
const tool = require('../util/constant')
const websockify = require('koa-websocket') //cg
const app = websockify(new Koa()); //cg
const qiniu = require('qiniu'); // 需要加载qiniu模块的
let ctxs = {}; //所用用户
let online = []; // 在线用户数组
app.listen(3001); //cg
router.prefix('/chat')

app.ws.use(async(ctx, next) => {
    /* 每打开一个连接就往 上线文数组中 添加一个上下文 */
    let { id } = ctx.query;
    ctxs[id] = ctx;

    /*这部分负责未读消息的处理*/
    // 首次连接将未读消息推送给用户
    const unreadMsg = await getdata('unreadMsg', { receiver: id });
    if (unreadMsg.length)
        unreadMsg.forEach(element => {
            ctxs[id].websocket.send(JSON.stringify(element));
        });
    // 消息推送给用户之后就从未读信息表中删除
    await deleteData('unreadMsg', { receiver: id });

    /*负责用户在线离线状态的处理*/
    online = Object.keys(ctxs);

    online.forEach(async(item) => {
        let myFriends = ((await getdata('friendIList', { userName: item }))[0] || {}).friendList || [{ friendName: '请先添加好友' }];
        // 求交集，给出在线好友列表
        let onlineFriend = [];
        myFriends.forEach((val) => { if (new Set(online).has(val.friendName)) onlineFriend.push(val.friendName) });
        if (onlineFriend !== []) {
            ctxs[item].websocket.send(JSON.stringify({ type: "isOnline", onlineFriend }))
        }
    })

    /*处理用户发送到后台的信息*/
    console.log(id + '  connect');
    ctx.websocket.on("message", async(message) => {
        let data = JSON.parse(message); //处理数据
        //聊天模式 分配对应数据
        if (data.type == "chat") {
            let info = data;
            if (!ctxs[data.receiver]) {
                ctx.websocket.send(JSON.stringify({
                    type: "chat",
                    send_time: new Date(),
                    send_msg: '对方未上线,已存入留言中',
                    send_id: data.receiver,
                    send_name: '机器人代发',
                    receiver: data.send_id,
                }));
                await insert('unreadMsg', info);
            } else {
                ctxs[data.receiver].websocket.send(JSON.stringify(info));
            }
        }
        // 添加好友接口
        else if (data.type === "add") {
            let info = data;
            if (!ctxs[data.receiver]) {
                ctx.websocket.send(JSON.stringify({
                    type: "add",
                    send_time: new Date(),
                    send_msg: '对方未上线,已存入留言中',
                    send_id: data.receiver,
                    send_name: '机器人代发',
                    receiver: data.send_id,
                }));
                await insert('unreadMsg', info);
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
        /*用户下线时更新好友的在线名单*/
        online.splice(online.indexOf(key), 1);
        online.forEach(async(item) => {
            let myFriends = (await getdata('friendIList', { userName: item }))[0].friendList || [{ friendName: '请先添加好友' }];
            // 求交集，给出在线好友列表
            let onlineFriend = myFriends.filter((val) => new Set(online).has(val));
            if (onlineFriend !== []) {
                ctxs[item].websocket.send(JSON.stringify({ type: "isOnline", onlineFriend }))
            }
        })

    });
});

router.get('/json', async(ctx, next) => {
        ctx.body = {
            title: 'websocket json'
        }
    })
    // 聊天模块相关接口
    // 获取好友列表
router.get('/getFriendList', async(ctx, next) => {
        let userName = ctx.query.userName;
        let res = await getdata('friendIList', { userName });
        const friendList = (res[0] || {}).friendList || [{ friendName: '请先添加好友' }]
        ctx.body = { friendList };
    })
    // 获取未读消息数量
router.get('/getMsgNum', async(ctx, next) => {
        let userName = ctx.query.userName;
        let res = await getdata('unreadMsg', { receiver: userName });
        const MsgNum = (res || []).length;
        ctx.body = { MsgNum };
    })
    // 获取查找好友时匹配的用户列表
router.get('/getMatchFriends', async(ctx, next) => {
        let target = ctx.query.id;
        let userName = ctx.query.userName;
        // 所有用户
        let allUsers = await getdata("IdInfo", {});
        let index = allUsers.findIndex(item => item.userName === userName);
        allUsers.splice(index, 1);
        // 我的好友
        let myFriends = ((await getdata('friendIList', { userName }))[0] || {}).friendList || [];
        let myFriendArr = [];
        myFriends.forEach((item) => { myFriendArr.push(item.friendName) })
        let result = allUsers.filter((item) => {
            return item.userName.indexOf(target) > -1 && !(myFriendArr || []).includes(item.userName);
        })
        ctx.body = { friends: result };
    })
    // 添加好友接口
router.get('/addFriend', async(ctx, next) => {
    let { userName, friend } = ctx.query;
    let friendArr_1 = (((await getdata('friendIList', { userName }))[0] || {}).friendList) || [];
    let friendArr_2 = (((await getdata('friendIList', { userName: friend }))[0] || {}).friendList) || [];
    let friendList_1 = [],
        friendList_2 = [];
    // 表情包url
    let userAvatarUrl = (await getdata('IdInfo', { userName: userName }))[0].avatarUrl || '';
    let friendAvatarUrl = (await getdata('IdInfo', { userName: friend }))[0].avatarUrl || '';
    friendArr_1.forEach((item) => { friendList_1.push(item.friendName) });
    friendArr_2.forEach((item) => { friendList_2.push(item.friendName) });
    if (!friendList_1.includes(friend))
        friendArr_1.push({ friendName: friend, avatarUrl: friendAvatarUrl });
    if (!friendList_2.includes(userName))
        friendArr_2.push({ friendName: userName, avatarUrl: userAvatarUrl });
    console.log(friendArr_1, friendArr_2);
    await deleteData('friendIList', { userName: userName });
    await deleteData('friendIList', { userName: friend });
    await insert('friendIList', { userName: userName, friendList: friendArr_1 });
    await insert('friendIList', { userName: friend, friendList: friendArr_2 });
    // 如果对方在线，就立即通知
    if (ctxs[friend]) ctxs[friend].websocket.send(JSON.stringify({ type: "renewList", newFriend: { friendName: userName, avatarUrl: userAvatarUrl } }));
    ctx.body = {
        code: "1",
        online: ctxs[friend] ? true : false,
        msg: "添加成功"
    }
})

router.get('/getMyInfo', async(ctx, next) => {
    let cookie = ctx.cookies.get('userinfo');
    let userName = new Buffer(cookie, 'base64').toString();
    let result = (await getdata('IdInfo', { userName: userName }))[0] || {};
    ctx.body = {
        info: result
    }
})

// 获取七牛云的token
router.get('/getQiniuToken', async(ctx, next) => {
    let cookie = ctx.cookies.get('userinfo');
    if (cookie) {
        let config = {
            "AK": "OlobbhWxZApzjY-3xeP7r-8f0GUx7GFVUX0UreCz",
            "SK": "zwaq5Pq4b6C6U7b7lZhAqiy-EN_SB9jFgcqUzw1H",
            "Bucket": "graduate-project"
        }
        let mac = new qiniu.auth.digest.Mac(config.AK, config.SK);
        let code = '1',
            data = {};
        let options = {
            scope: config.Bucket,
            expires: 3600 * 24
        };
        let putPolicy = new qiniu.rs.PutPolicy(options);
        let uploadToken = putPolicy.uploadToken(mac);
        if (uploadToken) {
            code = '0';
            data.uploadToken = uploadToken;
            ctx.body = { code, data }
        } else {
            ctx.body = { code, data }
        }
    }
})



module.exports = router
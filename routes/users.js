const router = require('koa-router')()
const { insert, getdata, deleteData } = require('../dao/dao')
const nodemail = require('../nodemailer')
const tool = require('../util/constant')
router.prefix('/users')

router.get('/', function(ctx, next) {
    ctx.body = 'this is a users response!'
})

// 邮箱发送验证码
router.get('/email', async(ctx, next) => {
    let email = ctx.query.email;
    let userName = ctx.query.userName;
    let password = ctx.query.password;
    let code = await tool.createRamdonNum(); //生成的随机六位数
    let date = new Date(); //获取当前时间
    //去数据库中找有没有同名的用户名
    let result = await getdata('IdInfo', { userName: userName });
    let emailArr = await getdata('IdInfo', { email: email });
    if (emailArr.length > 0) {
        ctx.body = { success: false, message: "邮箱已注册" }
    } else if (result.length > 0) {
        ctx.body = { success: false, message: "账号已经存在" }
    } else {
        ctx.body = { success: true, message: "验证码已经发送，请注意查收哦。" }; //数据传回前台
        let mail = {
            // 发件人
            from: '875903125@qq.com',
            // 主题
            subject: 'LBS旅游推荐系统用户注册验证码', //邮箱主题
            // 收件人
            to: email, //前台传过来的邮箱
            // 邮件内容，HTML格式
            text: '您的注册验证码是' + code + '，请尽快注册' //发送验证码
        };

        var json = { userName, email, password, code, date };
        await insert('registerCode', json); //将获取到的验证码存进数据库，待会提交时要检查是不是一致
        await nodemail(mail); //发送邮件
        // 从存放验证码的表中删除
        setTimeout(async() => {
            await deleteData('registerCode', { userName: userName })
        }, 60000);
    }
})

// 新用户注册确定接口
router.get('/register', async(ctx, next) => {
    let code = ctx.query.code;
    let userName = ctx.query.userName;
    let result = await getdata('registerCode', { userName: userName });
    if (result[0] && code === result[0].code) {
        ctx.body = { 'status': 1 }
        let json = result[0];
        delete json.code;
        await insert('IdInfo', json);
    } else {
        ctx.body = { 'status': 0 }
    }
})

// 用户登录接口
router.get('/login', async(ctx, next) => {
    let cookie = ctx.cookies.get('userinfo');
    if (cookie) {
        let userName = new Buffer(cookie, 'base64').toString();
        let result = (await getdata('IdInfo', { userName: userName }))[0];
        const { avatarUrl = "" } = result;
        ctx.body = { 'status': 1, info: 'login sucess', userName: new Buffer(cookie, 'base64').toString(), avatarUrl };
        return;
    }
    let userName = ctx.query.userName;
    let password = ctx.query.password;
    let result = await getdata('IdInfo', { userName: userName });
    if (result[0] && result[0].password === password) {
        // koa不能直接设置中文cookie,转成base64编码
        ctx.cookies.set('userinfo', new Buffer(userName).toString('base64'), {
            maxAge: 60 * 1000 * 60 * 24
        });
        ctx.body = { 'status': 1, info: 'login sucess', userName: userName, avatarUrl: result[0].avatarUrl }
    } else {
        ctx.body = { 'status': 0, info: 'login fail' }
    }
})

router.get('/renewInfo', async(ctx, next) => {
    let { userName, password, avatarUrl, email, date } = ctx.query;
    await deleteData('IdInfo', { userName });
    await insert('IdInfo', { userName, password, avatarUrl, email, date })
    ctx.body = {
        code: 1,
        msg: "修改信息成功！"
    }
})

module.exports = router
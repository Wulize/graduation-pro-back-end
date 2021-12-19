const router = require('koa-router')()
const { insert, getdata, deleteData } = require('../dao')
const nodemail = require('../nodemailer')
const tool = require('../constant')
router.prefix('/users')

router.get('/', function(ctx, next) {
    ctx.body = 'this is a users response!'
})

// 邮箱发送验证码
router.get('/email', async(ctx, next) => {
    let email = ctx.query.email;
    let user_name = ctx.query.user_name;
    let code = await tool.createRamdonNum(); //生成的随机六位数
    let date = new Date(); //获取当前时间
    //去数据库中找有没有同名的用户名，这里就要自己写了，不同的数据库查询方法不同
    let result = await getdata('IdInfo', { user_name: user_name });

    if (result.length > 0) {
        ctx.body = { success: false, message: "账号已经存在" }
    } else {
        ctx.body = { success: true, message: "账号可行" }; //数据传回前台
        let mail = {
            // 发件人
            from: '<yang7z2z@qq.com>',
            // 主题
            subject: '接受凭证', //邮箱主题
            // 收件人
            to: email, //前台传过来的邮箱
            // 邮件内容，HTML格式
            text: '用' + code + '作为你的验证码' //发送验证码
        };

        var json = { user_name, email, code, date };
        await insert('IdInfo', json); //将获取到的验证码存进数据库，待会提交时要检查是不是一致
        await nodemail(mail); //发送邮件
    }
})

// 新用户注册确定接口
router.get('/register', async(ctx, next) => {
    let code = ctx.query.code;
    let user_name = ctx.query.user_name;
    let result = await getdata('IdInfo', { user_name: user_name });
    if (code === result[0].code) {
        ctx.body = { 'status': 1 }
    } else {
        ctx.body = { 'status': 0 }
        await deleteData('IdInfo', { user_name: user_name })
    }
})

module.exports = router
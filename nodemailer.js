//nodemailer.js
const nodemailer = require('nodemailer');

//创建一个smtp服务器
const config = {
    host: 'smtp.qq.com',
    port: 465,
    auth: {
        user: 'yang7z2z@qq.com', //注册的qq邮箱账号
        pass: 'cbgeyvhbeaocbdeh' //邮箱的授权码
    }
};
// 创建一个SMTP客户端对象
const transporter = nodemailer.createTransport(config);

//发送邮件
module.exports = function(mail) {
    transporter.sendMail(mail, function(error, info) {
        if (error) {
            return console.log(error);
        }
        console.log('mail sent:', info.response);
    });
};
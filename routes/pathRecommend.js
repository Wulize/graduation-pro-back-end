const AntSystem = require('../antSystem')
const router = require('koa-router')()
const ant = new AntSystem([{ lng: 1, lat: 1 }, { lng: 1.051, lat: 1.009 }, { lng: 1.02, lat: 1.01 }])
router.prefix('/path')

router.get('/recommend', async(ctx, next) => {

    ctx.body = {
        title: ant.distance
    }
})

module.exports = router
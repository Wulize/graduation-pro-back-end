const AntSystem = require('../antSystem')
const router = require('koa-router')()
const ant = new AntSystem([{ lng: 118.108354, lat: 24.44184 }, { lng: 118.112612, lat: 24.435458 }, { lng: 118.181566, lat: 24.520184 }, { lng: 118.195137, lat: 24.499667 }])
router.prefix('/path')

router.get('/recommend', async(ctx, next) => {

    ctx.body = {
        title: ant.distance
    }
})

module.exports = router
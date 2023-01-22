const express = require('express')
const router = express.Router()

const article = require('./article_router')
const feed = require('./feed_router')
const news = require('./news_router')
const auth = require('./auth_router')
const history = require('./history_router')
// define the about route

router.use(article)
router.use(feed)
router.use(news)
router.use(auth)
router.use(history)

module.exports = router

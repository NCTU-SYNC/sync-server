const express = require('express')
const router = express.Router()

const article = require('./article_router')
const news = require('./news_router')
const auth = require('./auth_router')
// define the about route

router.use(article)
router.use(news)
router.use(auth)

module.exports = router

const router = require('express').Router()
const ctrl = require('../controllers/news_controller')

router.route('/news')
  .get(ctrl.getNews)

router.route('/news/latest')
  .get(ctrl.getLatestNews)

router.route('/news/admin')
  .get(ctrl.getLatestNewsAdmin)

router.route('/news/:id')
  .get(ctrl.getNewsById)

module.exports = router

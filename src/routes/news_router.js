const router = require('express').Router()
const ctrl = require('../controllers/news_controller')

router.route('/news')
  .get(ctrl.getNews)

router.route('/news/:id')
  .get(ctrl.getNewsById)

module.exports = router

const router = require('express').Router()
const ctrl = require('../controllers/feed_controller.js')

router.route('/feed/spotlight')
  .get(ctrl.getSpotlightArticles)

router.route('/feed/popular')
  .get(ctrl.getPopularArticles)

router.route('/feed/waitediting')
  .get(ctrl.getWaitEditingArticles)

router.route('/feed/dummies')
  .get(ctrl.getForDummies)

module.exports = router

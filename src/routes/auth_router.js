const router = require('express').Router()
const ctrl = require('../controllers/auth_controller')

router.route('/login')
  .post(ctrl.login)

router.route('/profile')
  .post(ctrl.getArticlesInfoById)

router.route('/profile/view')
  .post(ctrl.updateViewArticleToFirestore)

router.route('/profile/subscribe')
  .post(ctrl.subscribeArticleById)

module.exports = router

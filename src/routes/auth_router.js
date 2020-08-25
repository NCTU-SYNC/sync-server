const router = require('express').Router()
const ctrl = require('../controllers/auth_controller')

router.route('/login')
  .post(ctrl.login)

router.route('/storeArticleId').post(ctrl.storeArticleIdToFirestore)

module.exports = router

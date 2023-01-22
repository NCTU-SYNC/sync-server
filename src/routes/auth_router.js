const router = require('express').Router()
const ctrl = require('../controllers/auth_controller')
const adminCtrl = require('../controllers/admin_controller')

router.route('/login')
  .post(ctrl.login)

router.route('/profile')
  .post(ctrl.getProfileById)

router.route('/profile/updateNameModTime')
  .post(ctrl.updateNameModTime)

router.route('/profile/pref')
  .post(ctrl.getPref)

router.route('/profile/update/pref')
  .post(ctrl.updatePref)

router.route('/profile/view')
  .post(ctrl.updateViewArticleToFirestore)

router.route('/profile/subscribe')
  .post(ctrl.subscribeArticleById)

router.route('/profile/article')
  .post(ctrl.getArticlesInfo)

router.route('/userlist')
  .get(adminCtrl.getUnion)

router.route('/userlist/profile')
  .post(adminCtrl.getCertainUserProfile)

router.route('/userpoint')
  .get(adminCtrl.getPoints)

module.exports = router

const router = require('express').Router()
const ctrl = require('../controllers/auth_controller')

router.route('/login')
  .post(ctrl.login)

router.route('/profile')
  .post(ctrl.getProfileById)

router.route('/profile/updateNameModTime')
  .post(ctrl.updateNameModTime)

router.route('/profile/pref')
  .post(ctrl.getPref)

router.route('/profile/preference')
  .get(ctrl.getPreferences)

router.route('/profile/preference')
  .put(ctrl.updatePref)

router.route('/profile/view')
  .post(ctrl.updateViewArticleToFirestore)

router.route('/profile/subscribe')
  .post(ctrl.subscribeArticleById)

router.route('/profile/article')
  .post(ctrl.getArticlesInfo)

module.exports = router

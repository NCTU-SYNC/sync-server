const router = require('express').Router()
const ctrl = require('../controllers/auth_controller')

router.route('/login')
  .post(ctrl.login)

router.route('/profile')
  .post(ctrl.getProfileById)

router.route('/profile/displayName')
  .put(ctrl.updateDisplayName)

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

router.route('/profile/manyUsersInfo')
  .post(ctrl.getManyUsersInfo) // req.body  -->>  { "uids":["l18gziuFDxdmaJKdPwdQMeRIOvX2","WmPqnkHg9QfQ7NCuCh3WAV4cenN2","V1t2lp0nHYWrtREtLkCaLVHXMhx2"]}

module.exports = router

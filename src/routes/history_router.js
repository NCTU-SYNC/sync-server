const router = require('express').Router()
const ctrl = require('../controllers/history_controller')

router.route('/history/:id')
  .get(ctrl.getArticleVersionById)

router.route('/revision/:id')
  .get(ctrl.getBlockRevisionById)

module.exports = router

const router = require('express').Router()
const ctrl = require('../controllers/revision_controller')

router.route('/history/:id')
  .get(ctrl.getArticleRevisionById)

module.exports = router

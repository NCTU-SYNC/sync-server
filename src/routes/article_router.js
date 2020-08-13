const router = require('express').Router()
const ctrl = require('../controllers/article_controller')

router.route('/article')
  .get(ctrl.getArticles)

router.route('/article/:id')
  .get(ctrl.getArticleById)

router.route('/article')
  .post(ctrl.createArticle)

router.route('/article')
  .put(ctrl.updateArticleById)

router.route('/article/:id/authors')
  .get(ctrl.getArticleAuthors)

module.exports = router

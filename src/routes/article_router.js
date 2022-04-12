const router = require('express').Router()
const ctrl = require('../controllers/article_controller')

router.route('/article')
  .get(ctrl.getArticles)

router.route('/article/popular').get(ctrl.getPopularArticle)
router.route('/article/others').get(ctrl.getArticlesOthers)

router.route('/article/:id')
  .get(ctrl.getArticleById)

router.route('/article')
  .post(ctrl.createArticle)

router.route('/article')
  .put(ctrl.updateArticleById)

router.route('/article/:id/authors')
  .get(ctrl.getArticleAuthors)

router.route('/search')
  .get(ctrl.searchArticles)

router.route('/article/:id/authorsImg')
  .get(ctrl.getArticleAuthorsImg)

router.route('/article/putDeleteArticle')
  .put(ctrl.putDeleteArticleById) // req.body--> { "id":article_id}

router.route('/article/deleteArticle')
  .delete(ctrl.deleteArticleById) // req.body--> { "id":article_id}

module.exports = router

const Article = require('../models/article')

module.exports = {
  getArticleRevisionById (req, res, next) {
    Article
      .findById(req.params.id)
      .exec(
        async (err, doc) => {
          if (err) {
            res.status(500).send({
              code: 500,
              type: 'error',
              message: '文章的ID輸入有誤，請重新查詢'
            })
          } else {
            res.json({
              code: 200,
              type: 'success',
              data: doc
            })
          }
        })
  }
}

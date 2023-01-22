// Models
const Article = require('../models/feed')


module.exports = {
  getAndUpdateArticleById (req, res, next) {
    //do the change of mongodb's field value
    try{
      if(req.body.admin === true){
        if (!req.body.id) {
          res.status(500).send({
            code: 500,
            type: 'error',
            message: '文章的ID輸入有誤，請重新查詢'
          })
          return
        }
        const query = {}
        query[req.body.section] = req.body.choice//isPopular : true
        Article.findByIdAndUpdate(req.body.id, { $set: query })
          .exec(
            async (err, doc) => {
              if (err) {
                res.status(500).send({
                  code: 500,
                  type: 'error',
                  message: '文章的ID輸入有誤，請重新查詢'
                })
              } else {
                doc[req.body.section] = req.body.choice
                res.json({
                  code: 200,
                  type: 'success',
                  data: doc
                })
              }
            })
      }
      else{
        res.status(200).send({
          code: 403,
          type: 'error',
          message: "error message"
        })
      }
    }catch(error){
      console.log(error)
      res.status(200).send({
        code: 403,
        type: 'error',
        message: error.message
      })
    }
  },
}

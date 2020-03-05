const News = require('../models/news')

module.exports = {
  getNews (req, res, next) {
    const keyword = req.query.q || ''
    const limit = Number(req.query.limit)
    console.log('getNews: ' + keyword + ',' + limit)
    News.find({
      $or: [
        {
          title: {
            $regex: keyword,
            $options: 'i'
          }
        },
        {
          outline: {
            $regex: keyword,
            $options: 'i'
          }
        }
      ]
    })
      .limit(limit)
      .exec((err, doc) => {
        if (err || doc.length === 0) {
          res.json({
            code: 404,
            message: '查無搜尋結果'
          })
        } else {
          res.json({
            code: 200,
            data: doc
          })
        }
      })
  },
  getNewsById (req, res, next) {
    console.log('getNewsById: ' + req.params.id)
    News.findById(req.params.id).exec((err, doc) => {
      if (err) {
        res.json({
          code: 404,
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

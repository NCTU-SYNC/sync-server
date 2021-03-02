const News = require('../models/news')
const moment = require('moment')

module.exports = {
  getNews (req, res, next) {
    const keyword = req.query.q || ''
    const checkQueryLimit = Number(req.query.limit)
    const limit = isNaN(checkQueryLimit) ? 20 : checkQueryLimit
    const pageNumber = isNaN(Number(req.query.page)) ? 0 : Number(req.query.page)
    const time = req.query.tbs
    let timeQuery = {}
    switch (time) {
      case 'qdr:h':
        timeQuery = {
          modified_date: { $gte: moment().subtract(1, 'hours').toDate() }
        }
        break
      case 'qdr:d':
        timeQuery = {
          modified_date: { $gte: moment().subtract(1, 'days').toDate() }
        }
        break
      case 'qdr:w':
        timeQuery = {
          modified_date: { $gte: moment().subtract(1, 'weeks').toDate() }
        }
        break
      case 'qdr:y':
        timeQuery = {
          modified_date: { $gte: moment().subtract(1, 'years').toDate() }
        }
        break
      default: timeQuery = {}
        break
    }
    console.log('getNews: ' + keyword + ', ' + limit + ', ' + pageNumber)
    console.log({
      $or: [
        {
          title: {
            $regex: keyword,
            $options: 'i'
          }
        },
        {
          content: {
            $regex: keyword,
            $options: 'i'
          }
        }
      ],
      ...timeQuery
    })
    if (keyword) {
      News.find(
        {
          $or: [
            {
              title: {
                $regex: keyword,
                $options: 'i'
              }
            },
            {
              content: {
                $regex: keyword,
                $options: 'i'
              }
            }
          ],
          ...timeQuery
        }, null, { limit: limit, skip: pageNumber > 0 ? ((pageNumber - 1) * 20) : 0, sort: { _id: -1 } })
        .exec((err, doc) => {
          if (err || doc.length === 0) {
            console.error(err)
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
    } else {
      res.status(500).send({
        code: 500,
        type: 'error',
        message: '搜尋新聞關鍵字輸入有誤，請重新查詢'
      })
    }
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

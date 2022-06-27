const News = require('../models/news')
const moment = require('moment')
const Elastic = require('../lib/elasticSearch')
const mediaSources = ['中時', '中央社', '華視', '東森', 'ettoday', '台灣事實查核中心', '自由時報', '風傳媒', '聯合', '三立']

module.exports = {
  getNews (req, res, next) {
    console.log('/news_controller/getNews')
    const keyword = req.query.q || ''
    const checkQueryLimit = Number(req.query.limit)
    const limit = isNaN(checkQueryLimit) ? 3 : checkQueryLimit
    const pageNumber = isNaN(Number(req.query.page)) ? 0 : Number(req.query.page)
    const time = req.query.tbs
    const media = req.query.media.toString() || ''
    let searchQuery = {}
    if (media) {
      const searchMediaIndex = mediaSources.indexOf(media)
      searchQuery = searchMediaIndex >= 0 ? { media } : {}
    }
    let timeQuery = {}
    console.log(keyword, 'limit:', limit, 'page', pageNumber, 'time:', time, media)
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
    if (keyword) {
      News.find(
        {
          ...searchQuery,
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
        }, null, { limit: limit, skip: pageNumber > 0 ? pageNumber * limit : 0, sort: { _id: -1 } })
        .exec((err, doc) => {
          if (err || doc.length === 0) {
            console.error(err)
            res.status(200).send({
              code: 404,
              type: 'error',
              message: '查無搜尋結果'
            })
          } else {
            res.json({
              code: 200,
              type: 'success',
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
  async searchNews (req, res) {
    console.log('/news_controller/searchNews')
    const keyword = req.query.q || ''
    console.log(keyword + '...')
    const result = await Elastic.search({
      index: 'mainmax',
      body: {
        query: {
          match: { content: keyword }
        }
      }
    })
    res.send(result.body.hits.hits)
  },
  getLatestNews (req, res) {
    let limit = 50
    if (Object.prototype.hasOwnProperty.call(req.query, 'limit')) {
      limit = isNaN(Number(req.query.limit)) ? 50 : Number(req.query.limit)
    }
    News.find({}, null, { sort: { modified_date: -1 } }).limit(limit)
      .exec((err, doc) => {
        if (err) {
          res.status(500).send({
            code: 500,
            type: 'error',
            message: '搜尋發生錯誤，請重新查詢'
          })
        } else {
          res.json({
            code: 200,
            type: 'success',
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

// Models
const Article = require('../models/article')
const { MODE } = require('../utils/constant')


module.exports = {
  getSpotlightArticles (req, res, next) {
    if (req.query.mode === MODE.DEBUG) {
      console.log('[Mock][Articles] use mock data')
      mockController.mockArticles(req, res)
      return
    }

    const keyword = req.query.q || ''
    const limit = Number(req.query.limit)
    console.log('getArticles: ' + keyword + ',' + limit)
    Article
      .find({
        isSpotlight: true
      }, null, { limit: limit, sort: { _id: -1 } })
      .exec(
        async (err, doc) => {
          if (err || doc.length === 0) {
            res.status(200).send({
              code: 404,
              type: 'success',
              message: '查無搜尋結果'
            })
          } else {
            res.json({
              code: 200,
              type: 'success',
              data: [doc]
            })
          }
        })
  },
  getPopularArticles (req, res, next) {
    if (req.query.mode === MODE.DEBUG) {
      console.log('[Mock][Articles] use mock data')
      mockController.mockArticles(req, res)
      return
    }

    const keyword = req.query.q || ''
    const limit = Number(req.query.limit)
    console.log('getArticles: ' + keyword + ',' + limit)
    Article
      .find({
        isPopular: true
      }, null, { limit: limit, sort: { _id: -1 } })
      .exec(
        async (err, doc) => {
          if (err || doc.length === 0) {
            res.status(200).send({
              code: 404,
              type: 'success',
              message: '查無搜尋結果'
            })
          } else {
            res.json({
              code: 200,
              type: 'success',
              data: [doc]
            })
          }
        })
  },
  getWaitEditingArticles (req, res, next) {
    if (req.query.mode === MODE.DEBUG) {
      console.log('[Mock][Articles] use mock data')
      mockController.mockArticles(req, res)
      return
    }

    const keyword = req.query.q || ''
    const limit = Number(req.query.limit)
    console.log('getArticles: ' + keyword + ',' + limit)
    Article
      .find({
        isWaitEditing: true
      }, null, { limit: limit, sort: { _id: -1 } })
      .exec(
        async (err, doc) => {
          if (err || doc.length === 0) {
            res.status(200).send({
              code: 404,
              type: 'success',
              message: '查無搜尋結果'
            })
          } else {
            res.json({
              code: 200,
              type: 'success',
              data: [doc]
            })
          }
        })
  },
  getForDummies (req, res, next) {
    if (req.query.mode === MODE.DEBUG) {
      console.log('[Mock][Articles] use mock data')
      mockController.mockArticles(req, res)
      return
    }

    const keyword = req.query.q || ''
    const limit = Number(req.query.limit)
    console.log('getArticles: ' + keyword + ',' + limit)
    Article
      .find({
        isForDummies: true
      }, null, { limit: limit, sort: { _id: -1 } })
      .exec(
        async (err, doc) => {
          if (err || doc.length === 0) {
            res.status(200).send({
              code: 404,
              type: 'success',
              message: '查無搜尋結果'
            })
          } else {
            res.json({
              code: 200,
              type: 'success',
              data: [doc]
            })
          }
        })
  },
}

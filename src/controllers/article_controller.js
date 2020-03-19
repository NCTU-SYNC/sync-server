var Article = require('../models/article')
const auth = require('../controllers/auth_controller')
// const mongoose = require('mongoose')
const jsonpatch = require('fast-json-patch')

module.exports = {
  getArticles (req, res, next) {
    const keyword = req.query.q || ''
    const limit = Number(req.query.limit)
    console.log('getArticles: ' + keyword + ',' + limit)
    Article
      .find({
        $or: [{
          title: {
            $regex: keyword,
            $options: 'i'
          }
        }, {
          outline: {
            $regex: keyword,
            $options: 'i'
          }
        }]
      })
      .limit(limit)
      .exec(
        (err, doc) => {
          if (err || doc.length === 0) {
            res.status(404).send({
              code: 404,
              type: 'success',
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
  },
  getArticleById (req, res, next) {
    console.log('getArticleById: ' + req.params.id)
    Article
      .findById(req.params.id)
      .exec(
        (err, doc) => {
          if (err) {
            res.status(500).send({
              code: 500,
              type: 'error',
              message: '文章的ID輸入有誤，請重新查詢'
            })
          } else {
            /* const newDoc = {
              tags: doc.tags,
              title: doc.title,
              blocks: doc.blocks,
              entityMap: doc.entityMap,
              timeStamp: doc.timeStamp
            } */
            res.json({
              code: 200,
              type: 'success',
              data: doc
            })
          }
        })
  },
  async createArticle (req, res, next) {
    console.log(req.body)
    try {
      // const uid = await auth.verifyIdToken(req.body.token)
      // console.log('uid: ' + uid)
      const data = req.body
      const article = new Article({
        title: data.title,
        category: [],
        content: {
          blocks: JSON.parse(data.blocks),
          entityMap: JSON.parse(data.entityMap)
        }
      })
      // 需要對uid進行log寫入

      await article.save().then(result => {
        console.log(result)
        res.status(200).send({
          code: 200,
          type: 'success',
          id: result.id
        })
        return Promise.resolve()
      }).catch(error => {
        console.error(error)
        return Promise.reject(error)
      })
    } catch (error) {
      res.status(500).send({
        code: 500,
        type: 'error',
        message: error.message
      })
    }
  },
  async updateArticleById (req, res, next) {
    console.log('updateArticleById: ' + req.body.id)

    try {
      const uid = await auth.verifyIdToken(req.body.token)
      console.log('uid: ' + uid)
      const id = req.body.id
      const patches = req.body.data

      var article = await Article.findById(id).lean()
      if (article === undefined) {
        res.status(500).send({
          code: 500,
          type: 'error',
          message: '文章的ID輸入有誤，請重新查詢'
        })
      } else {
        var errors = jsonpatch.validate(patches, article)
        if (errors === undefined) {
          var updateObj = jsonpatch.applyPatch(article, patches).newDocument
          Article.findOneAndUpdate(id, updateObj, { new: true, upsert: true }, (err, doc) => {
            if (err) {
              res.status(500).send({
                code: 500,
                type: 'error',
                message: '更新文章時發生錯誤'
              })
              return
            }
            res.json({
              code: 200,
              type: 'success',
              data: doc,
              message: '已成功更新文章'
            })
          })
        } else {
          res.status(500).send({
            code: 500,
            type: 'error',
            message: errors.message
          })
        }
      }
    } catch (error) {
      res.status(500).send({
        code: 500,
        type: 'error',
        message: error.message
      })
    }
  }
}

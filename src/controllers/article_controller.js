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
      }, null, { limit: limit, sort: { _id: -1 } })
      .exec(
        (err, doc) => {
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
              data: doc
            })
          }
        })
  },
  getArticleById (req, res, next) {
    try {
      console.log('getArticleById: ' + req.params.id)
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
              doc.authors = await module.exports.getArticleAuthorsByAuthorIds(doc.authors)
              console.log(doc.authors, 'result')
              res.json({
                code: 200,
                type: 'success',
                data: doc
              })
            }
          })
    } catch (error) {
      console.log(error)
      res.json({
        code: 200,
        type: 'error',
        message: '發生未知的錯誤，請稍後再試'
      })
    }
  },
  async createArticle (req, res, next) {
    console.log('createArticle')
    console.log(req.body)
    try {
      // const uid = await auth.verifyIdToken(req.body.token)
      // console.log('uid: ' + uid)
      const data = req.body
      const article = new Article({
        title: data.title,
        tags: data.tags,
        authors: data.authors,
        category: [],
        createAt: new Date(data.createAt),
        blocks: data.blocks
      })
      // 需要對uid進行log寫入

      await article.save().then(result => {
        console.log(result)
        res.status(200).send({
          code: 200,
          type: 'success',
          message: '成功發布新文章',
          id: result.id
        })
        return Promise.resolve()
      }).catch(error => {
        res.status(200).send({
          code: 500,
          type: 'error',
          message: '請輸入標題'
        })
        return Promise.reject(error)
      })
    } catch (error) {
      console.log(error)
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
      // 使用者登入用
      // const uid = await auth.verifyIdToken(req.body.token)
      // console.log('uid: ' + uid)
      const id = req.body.id
      console.log(id)
      // JsonPatch http://jsonpatch.com/
      // 需要實作判斷更新功能
      // const patches = req.body.blocks

      var article = await Article.findById(id).lean()
      if (article === undefined) {
        console.log(article)
        res.status(200).send({
          code: 500,
          type: 'error',
          message: '文章的ID輸入有誤，請重新查詢'
        })
      } else {
        // var errors = jsonpatch.validate(patches, article)
        var errors = undefined
        if (errors === undefined) {
          // var updateObj = jsonpatch.applyPatch(article, patches).newDocument
          var updateObj = req.body
          Article.findOneAndUpdate({ _id: id }, updateObj, { new: true, upsert: true }, (err, doc) => {
            if (err) {
              res.status(200).send({
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
            module.exports.updateArticleEditingCount(id)
          })
        } else {
          console.log(errors)
          res.status(200).send({
            code: 500,
            type: 'error',
            message: errors.message
          })
        }
      }
    } catch (error) {
      console.log(error)
      res.status(200).send({
        code: 500,
        type: 'error',
        message: error.message
      })
    }
  },
  updateArticleEditingCount (articleId) {
    Article.findOneAndUpdate({ _id: articleId }, { $inc: { editedCount: 1 } }, { new: true, upsert: true }, (err, doc) => {
      if (err) {
        console.log(err)
      } else {
        console.log(doc)
        console.log('已更新', articleId)
      }
    })
  },
  async getArticleAuthorsByAuthorIds (authors) {
    try {
      const authorsArray = []
      for (const authorId of authors) {
        const { displayName } = await auth.getUserInfoById(authorId)
        authorsArray.push({ uid: authorId, displayName: displayName })
      }
      return Promise.resolve(authorsArray)
    } catch (error) {
      console.log(error)
      return Promise.reject(error)
    }
  },
  async getArticleAuthors (req, res, next) {
    try {
      const articleId = req.params.id
      const doc = await Article.findById(articleId).exec()
      const authors = []
      for (const authorId of doc.authors) {
        const { displayName } = await auth.getUserInfoById(authorId)
        authors.push({ uid: authorId, displayName: displayName })
      }
      res.status(200).send({
        code: 200,
        type: 'success',
        data: authors,
        message: '已成功抓取作者'
      })
    } catch (error) {
      console.log(error)
    }
  }
}

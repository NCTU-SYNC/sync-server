var firebase = require('../lib/firebase')
var admin = require('firebase-admin')
var Article = require('../models/article')
var Block = require('../models/block')
var Content = require('../models/content')
const auth = require('../controllers/auth_controller')
const diff = require('../controllers/diff_controller')
// const mongoose = require('mongoose')
const jsonpatch = require('fast-json-patch')
const mongoose = require('mongoose')
const ObjectId = require('mongodb').ObjectId;

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
            res.json({
              code: 200,
              type: 'success',
              data: doc
            })
          }
        })
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
      for (var block in article.blocks) {  
        console.log({block})
        article.blocks[block]["blockRevision"] = 1
        console.log(article.blocks[block]["blockRevision"])
        console.log(article.blocks[block]["content"])
      }
      // article.blocks = article.blocks.map((val)=>　({...val, blockRevision:123}))
      console.log("############")
      console.log(article)
      console.log("############")
      // 需要對uid進行log寫入
      for (var block in article["blocks"]) {
        var newBlock = new Block({
          blockId: article["blocks"][block]["_id"],
          articleId: article._id,
          revisions: [{
            revisionId: mongoose.Types.ObjectId(),
            updatedAt: new Date(),
            contentId: mongoose.Types.ObjectId(),
            author: ""
          }]
        })
        var newContent = new Content({
          contentId: newBlock.revisions[0].contentId,
          blockId: newBlock.blockId,
          articleId: newBlock.articleId,
          content: article["blocks"][block]["content"]
        })
        await newBlock.save()
        await newContent.save().then(result => {
          console.log("########")
          console.log(result)
          console.log("########")
        })
      }
      await article.save().then(result => {
        console.log(result)
        res.status(200).send({
          code: 200,
          type: 'success',
          message: '成功發布新文章',
          id: result.id
        })
        module.exports.storeArticleIdToFirestore(data.uid, result.id)
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
      const { id, uid } = req.body
      console.log(id)
      // JsonPatch http://jsonpatch.com/
      // 需要實作判斷更新功能
      // const patches = req.body.blocks

      var article = await Article.findById(id).lean()
      console.log(article)
      
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
          for (var block in updateObj["blocks"]) {
            if (!updateObj["blocks"][block].hasOwnProperty("blockRevision")) {
              updateObj["blocks"][block]["blockRevision"] = 1
            }
            if( await diff.compareContent(updateObj["blocks"][block]["content"], article["blocks"][block]["content"])) { 
              updateObj["blocks"][block]["blockRevision"] += 1
              recentBlockRevision = updateObj["blocks"][block]["blockRevision"]
              // const newBlock = new Block({
              //   blockId: article["blocks"][block]["_id"],
              //   articleId: req.body.id,
              //   revisions: [{
              //     revisionId: mongoose.Types.ObjectId(),
              //     updatedAt: new Date(),
              //     content: article["blocks"][block]["content"],
              //     author: ""
              //   }]
              // })
              // console.log("########")
              // console.log(newBlock)
              // console.log("########")
              // await newBlock.save().then(result => {
              //   console.log("########")
              //   console.log(result)
              //   console.log("########")
              // })  
            }
          }
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
            module.exports.storeArticleIdToFirestore(uid, id)
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
      for (const author of authors) {
        const { displayName } = await auth.getUserInfoById(author.uid)
        authorsArray.push({ uid: author.uid, displayName: displayName })
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
      for (const author of doc.authors) {
        const { displayName } = await auth.getUserInfoById(author.uid)
        authors.push({ uid: author.uid, displayName: displayName })
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
  },
  async storeArticleIdToFirestore (uid, articleId) {
    const userRef = firebase.db.collection('users').doc(uid)
    userRef.update({
      editPostIds: admin.firestore.FieldValue.arrayUnion(articleId)
    })
      .then(res => console.log(res))
      .catch(err => console.log(err))
  }
}

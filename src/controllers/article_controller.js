var firebase = require('../lib/firebase')
var admin = require('firebase-admin')
var Article = require('../models/article')
var Block = require('../models/block')
var Content = require('../models/content')
var Version = require('../models/version')
const auth = require('../controllers/auth_controller')
const diff = require('../controllers/diff_controller')

const mongoose = require('mongoose')

async function createNewBlock (recBlock, articleId, uid, name) {
  const blockId = recBlock._id ? recBlock._id : mongoose.Types.ObjectId()
  var newBlock = new Block({
    blockId,
    articleId: articleId,
    revisions: [{
      updatedAt: new Date(),
      contentId: mongoose.Types.ObjectId(),
      blockTitle: recBlock.blockTitle,
      author: { uid, name }
    }],
    authors: [{ uid, name }]
  })
  var newContent = new Content({
    _id: newBlock.revisions[0].contentId,
    blockId,
    articleId: articleId,
    content: recBlock.content
  })
  await newContent.save()
  await newBlock.save()
  return { blockId: newContent.blockId, contentId: newContent._id, revisionId: newBlock.revisions[0]._id }
}

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
    try {
      const data = req.body
      const { token } = data
      const { uid, name } = await firebase.admin.auth().verifyIdToken(token)
      const newArticleId = mongoose.Types.ObjectId()
      const newArticleBlocksList = []
      for (const block of data.blocks) {
        const { blockId, contentId, revisionId } = await createNewBlock(block, newArticleId, uid, name)
        block._id = blockId
        const blockAddToVersion = { blockId, contentId, revisionIndex: 0, order: 0, authors: [{ uid, name }] }
        newArticleBlocksList.push(blockAddToVersion)
      }

      const article = new Article({
        _id: newArticleId,
        title: data.title,
        tags: data.tags,
        authors: !data.authors.some(author => JSON.stringify(author) === JSON.stringify({ uid, name })) ? data.authors.concat({ uid, name }) : data.authors,
        category: [],
        createAt: new Date(data.createAt),
        blocks: data.blocks.map(block => ({ ...block, authors: [{ uid, name }] }))
      })

      const version = new Version({
        articleId: article._id,
        versions: [{
          title: data.title,
          updatedAt: new Date(),
          blocks: newArticleBlocksList,
          author: { uid, name }
        }]
      })
      await version.save()
      await article.save().then(result => {
        res.status(200).send({
          code: 200,
          type: 'success',
          message: '成功發布新文章',
          id: result.id
        })
        // module.exports.storeArticleIdToFirestore(data.uid, result.id)
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
      const { id, token } = req.body
      const { uid, name } = await firebase.admin.auth().verifyIdToken(token)
      // console.log('uid = ', uid)
      var article = await Article.findById(id).lean()
      if (article === undefined) {
        res.status(200).send({
          code: 500,
          type: 'error',
          message: '文章的ID輸入有誤，請重新查詢'
        })
      } else {
        var errors
        if (errors === undefined) {
          const updateObj = req.body
          updateObj.authors = !updateObj.authors.some(author => JSON.stringify(author) === JSON.stringify({ uid, name })) ? [...updateObj.authors, { uid, name }] : updateObj.authors
          const latestVersionBlocksList = []
          const articleVersion = await Version.findOne({ articleId: article._id })

          // Find block id in update object
          for (const [index, block] of updateObj.blocks.entries()) {
            const articleBlock = article.blocks.find((ab) => {
              if (block._id === undefined) {
                // There is no _id property in new block
                return false
              } else {
                return ab._id.toString() === block._id.toString()
              }
            })

            if (articleBlock) {
              console.log('articleBlock')
              // Find block, check different
              if (diff.compareContent(block.content, articleBlock.content)) {
                console.log('diff.compareContent = true')
                const newContent = new Content({
                  blockId: block._id,
                  articleId: article._id,
                  content: block.content
                })
                await newContent.save()

                const newBlock = await Block.findOne({ blockId: block._id })
                newBlock.revisions.push({
                  updatedAt: new Date(),
                  contentId: newContent._id,
                  blockTitle: block.blockTitle,
                  author: { uid, name }
                })
                newBlock.authors = !newBlock.authors.some(author => JSON.stringify(author) === JSON.stringify({ uid, name })) ? [...newBlock.authors, { uid, name }] : newBlock.authors
                updateObj.blocks[index].authors = !newBlock.authors.some(author => JSON.stringify(author) === JSON.stringify({ uid, name })) ? [...newBlock.authors, { uid, name }] : newBlock.authors
                await newBlock.save()

                latestVersionBlocksList.push({
                  blockId: newContent.blockId,
                  contentId: newContent._id,
                  order: 0,
                  revisionIndex: newBlock.revisions.length - 1,
                  authors: newBlock.authors
                })
              } else {
                console.log('diff.compareContent = false')

                const currentVersion = articleVersion.versions.length - 1
                const targetCopiedBlock = articleVersion.versions[currentVersion].blocks.find((b) => {
                  if (b.blockId === undefined) {
                    return false
                  } else {
                    return b.blockId.toString() === block._id
                  }
                })
                if (targetCopiedBlock) {
                  console.log(`find block id: ${block._id}`)
                  latestVersionBlocksList.push(targetCopiedBlock)
                }
              }
            } else {
              console.log('createNewBlock')
              // { blockId: newContent.blockId, contentId: newContent._id, revisionId: newBlock.revisions[0]._id }
              const { blockId, contentId } = await createNewBlock(block, article._id, uid, name)
              block._id = blockId
              latestVersionBlocksList.push({
                blockId,
                contentId,
                revisionIndex: 0,
                order: 0,
                authors: [{ uid, name }]
              })
            }
          }

          const _version = {
            title: req.body.title,
            author: { uid, name },
            updatedAt: new Date(),
            blocks: latestVersionBlocksList
          }
          articleVersion.versions.push(_version)
          await Version.findOneAndUpdate({ articleId: article._id }, articleVersion, { new: true, upsert: true })
          // TODO: update Article 底下的 authors 和 blocks 裡面的 authors
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
            // module.exports.storeArticleIdToFirestore(uid, id)
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

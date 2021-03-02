var firebase = require('../lib/firebase')
var admin = require('firebase-admin')
var Article = require('../models/article')
var Block = require('../models/block')
var Content = require('../models/content')
var Version = require('../models/version')
var LatestNews = require('../models/latestNews')
const auth = require('../controllers/auth_controller')
const diff = require('../controllers/diff_controller')

const mongoose = require('mongoose')

const isExistedAuthor = (originalAuthors, uid, name) => originalAuthors.some(author => JSON.stringify(author) === JSON.stringify({ uid, name }))
const getUpdatedAuthors = (originalAuthors, uid, name) => !isExistedAuthor(originalAuthors, uid, name) ? originalAuthors.concat({ uid, name }) : originalAuthors

async function createNewBlock (recBlock, articleId, uid, name) {
  const blockId = recBlock._id ? recBlock._id : mongoose.Types.ObjectId()
  var newBlock = new Block({
    blockId,
    articleId: articleId,
    revisions: [{
      updatedAt: new Date(),
      contentId: mongoose.Types.ObjectId(),
      blockTitle: recBlock.blockTitle,
      author: { uid, name },
      revisionIndex: 1
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
async function cleanLatestNews () {
  const latestNewsCount = await LatestNews.find({})
  var collectionLength = latestNewsCount.length
  while (collectionLength > 10) {
    const latestOneNews = await LatestNews.find({ articleId: latestNewsCount[collectionLength - 1].articleId })
    if (latestOneNews.length > 1) {
      LatestNews.findByIdAndRemove(latestOneNews[0]._id, function (err, docs) {
        if (err) console.log(err)
      })
    } else {
      LatestNews.findByIdAndRemove(latestNewsCount[0]._id, function (err, docs) {
        if (err) console.log(err)
      })
    }
    collectionLength -= 1
  }
  // LatestNews.findOneAndRemove()
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
        const { blockId, contentId } = await createNewBlock(block, newArticleId, uid, name)
        block._id = blockId
        const blockAddToVersion = { blockId, contentId, revisionIndex: 0, order: 0 }
        newArticleBlocksList.push(blockAddToVersion)
      }

      const article = new Article({
        _id: newArticleId,
        title: data.title,
        tags: data.tags,
        authors: getUpdatedAuthors(data.authors, uid, name),
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
          author: { uid, name },
          versionIndex: 1
        }]
      })
      const latestNews = new LatestNews({
        articleId: newArticleId,
        updatedAt: new Date()
      })
      // 更新最新新聞
      await latestNews.save()
      await cleanLatestNews()
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
          let checkIfChange = false
          const updateObj = req.body
          updateObj.authors = getUpdatedAuthors(updateObj.authors, uid, name)
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

            if (articleBlock) { // if content has been changed
              console.log('articleBlock')
              // Find block, check different
              if (diff.compareContent(block.content, articleBlock.content)) {
                checkIfChange = true
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
                  author: { uid, name },
                  revisionIndex: newBlock.revisions.length + 1
                })
                newBlock.authors = getUpdatedAuthors(newBlock.authors, uid, name)
                updateObj.blocks[index].authors = getUpdatedAuthors(newBlock.authors, uid, name)
                await newBlock.save()

                latestVersionBlocksList.push({
                  blockId: newContent.blockId,
                  contentId: newContent._id,
                  order: 0,
                  revisionIndex: newBlock.revisions.length - 1,
                  authors: newBlock.authors
                })
              } else if (block.blockTitle !== articleBlock.blockTitle) { // if only blocktitle has been changed
                checkIfChange = true
                console.log('only block title has been changed')
                const newBlock = await Block.findOne({ blockId: block._id })
                console.log(newBlock.revisions[newBlock.revisions.length - 1].contentId)
                newBlock.revisions.push({
                  updatedAt: new Date(),
                  contentId: newBlock.revisions[newBlock.revisions.length - 1].contentId,
                  blockTitle: block.blockTitle,
                  author: { uid, name },
                  revisionIndex: newBlock.revisions.length + 1
                })
                newBlock.authors = getUpdatedAuthors(newBlock.authors, uid, name)
                updateObj.blocks[index].authors = getUpdatedAuthors(newBlock.authors, uid, name)
                await newBlock.save()

                latestVersionBlocksList.push({
                  blockId: block.blockId,
                  contentId: newBlock.revisions[newBlock.revisions.length - 1].contentId,
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
              checkIfChange = true
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
          if (!checkIfChange) {
            const detectArticle = Article.findOne({ _id: id })
            if (detectArticle.title !== updateObj.title) { checkIfChange = true }
          }
          if (checkIfChange) {
            const currentVersion = articleVersion.versions.length + 1
            articleVersion.versions.push({
              title: req.body.title,
              author: { uid, name },
              updatedAt: new Date(),
              blocks: latestVersionBlocksList,
              versionIndex: currentVersion
            })
            await Version.findOneAndUpdate({ articleId: article._id }, articleVersion, { new: true, upsert: true })
            const latestNews = new LatestNews({
              articleId: article._id,
              updatedAt: new Date()
            })
            // 更新最新新聞
            await latestNews.save()
            await cleanLatestNews()
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
  },
  async getPopularArticle (req, res, next) {
    const latestNewsCount = await LatestNews.find({}).sort({ _id: -1 })
    const doc = []
    var i = 0
    for (const latestNews of latestNewsCount) {
      if (i <= 6) {
        const { category, title, viewCount } = Article.findById(latestNews.articleId)
        doc.push({ category, title, viewCount })
      }
      i += 1
    }
    res.status(200).send({
      code: 200,
      type: 'success',
      data: doc
    })
  }
}

// Models
const Article = require('../models/article')
const Block = require('../models/block')
const Content = require('../models/content')
const Version = require('../models/version')
const LatestNews = require('../models/latestNews')
const DiffMatchPatch = require('diff-match-patch')
const Utils = require('../utils')
const { MODE } = require('../utils/constant')
const moment = require('moment')
const mockController = require('../mock')
const mongoose = require('mongoose')
const categories = ['政經', '社會', '環境', '運動', '國際', '科技', '生活']

// const config = require('../../config/config')
// const Redis = require('redis')

// const redisClient = Redis.createClient()
// const DEFAULT_EXPIRATION = 3600

const isExistedAuthor = (originalAuthors, targetAuthor) => {
  return originalAuthors.some(author => JSON.stringify(author) === JSON.stringify(targetAuthor))
}

const getUpdatedAuthors = (originalAuthors, targetAuthor) => {
  for (const author of originalAuthors) {
    if (author.isAnonymous === undefined) { author.isAnonymous = false }
  }
  if (isExistedAuthor(originalAuthors, targetAuthor)) {
    return originalAuthors
  } else {
    if (targetAuthor.isAnonymous) {
      return originalAuthors.concat({ uid: targetAuthor.uid, name: '匿名', isAnonymous: true })
    }
    return originalAuthors.concat(targetAuthor)
  }
}

async function createNewBlock (recBlock, articleId, author) {
  const blockId = recBlock._id ? recBlock._id : mongoose.Types.ObjectId()
  var newBlock = new Block({
    blockId,
    articleId: articleId,
    revisions: [{
      updatedAt: new Date(),
      contentId: mongoose.Types.ObjectId(),
      blockTitle: recBlock.blockTitle,
      author,
      revisionIndex: 1
    }],
    authors: [author]
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
function getPlainText (blockContent) {
  let content = ''
  blockContent.content.forEach(paragraph => {
    if (paragraph.content) {
      paragraph.content.forEach(text => {
        content += text.text
      })
    }
    content += '\n\n'
  })
  return content
}
async function compareArticleByWord (blocks1, blocks2) {
  const dmp = new DiffMatchPatch()
  // diff 的陣列
  const articleDiff = []
  // 存放 diff base 和 compare 的 dictionary
  const diffDict = {}
  // 排列 diff id 順序的陣列
  const diffOrderArr = []
  for (const block of blocks1.blocks) {
    // 確認有blockId
    if (block._id) {
      // 確認字典裡面尚無 blockId
      if (diffDict[block._id] === undefined) {
        diffOrderArr.push(block._id)
        // 設定 base 的標題與文字
        diffDict[block._id] = {
          base: {
            title: block.blockTitle,
            text: getPlainText(block.content)
          }
        }
      }
    }
  }
  let i = 0
  for (const block of blocks2.blocks) {
    // 確認有blockId
    if (block._id) {
      // 若比較的版本有插入新段落，則在 order 陣列新增，待會則照順序查看陣列
      if (!diffOrderArr.includes(block._id.toString())) {
        diffOrderArr.splice(i, 0, block._id)
      }
      // 確認字典裡面尚無 blockId
      if (diffDict[block._id] === undefined) {
        diffDict[block._id] = {
          // 設定 compare 的標題與文字
          compare: {
            title: block.blockTitle,
            text: getPlainText(block.content)
          }
        }
      } else {
        // 設定 compare 的標題與文字
        diffDict[block._id].compare = {
          title: block.blockTitle,
          text: getPlainText(block.content)
        }
      }
    }
    i += 1
  }
  let addedWordCount = 0
  let deletedWordCount = 0
  for (const blockId of diffOrderArr) {
    const empty = {
      title: '',
      text: '\n\n'
    }
    // 設定 base，若無 base 則給予空物件比對
    const base = diffDict[blockId] ? diffDict[blockId].base ? diffDict[blockId].base : empty : empty
    // 設定 base，若無 base 則給予空物件比對
    const compare = diffDict[blockId] ? diffDict[blockId].compare ? diffDict[blockId].compare : empty : empty
    const titleDiff = dmp.diff_main(base.title, compare.title)
    const contentDiff = dmp.diff_main(base.text, compare.text)
    dmp.diff_cleanupSemantic(titleDiff)
    dmp.diff_cleanupSemantic(contentDiff)
    articleDiff.push({ titleDiff, contentDiff })
    for (const titleElement of titleDiff) {
      if (titleElement[0] === 1) {
        deletedWordCount += titleElement[1].length
      } else if (titleElement[0] === -1) {
        addedWordCount += titleElement[1].length
      }
    }
    for (const contentElement of contentDiff) {
      if (contentElement[0] === 1) {
        deletedWordCount += contentElement[1].length
      } else if (contentElement[0] === -1) {
        addedWordCount += contentElement[1].length
      }
    }
  }
  console.log({ addedWordCount, deletedWordCount })
  return { addedWordCount, deletedWordCount }
}

module.exports = {
  getArticles (req, res, next) {
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
        async (err, doc) => {
          if (err || doc.length === 0) {
            res.status(200).send({
              code: 404,
              type: 'success',
              message: '查無搜尋結果'
            })
          } else {
            // const latestNewsCount = await LatestNews.find({}).sort({ _id: -1 })
            // console.log(latestNewsCount)
            const doc2 = []
            // var i = 0
            // for (const latestNews of latestNewsCount) {
            //   if (i <= 6) {
            //     try {
            //       const { category, title, viewsCount, _id, tags, lastUpdatedAt, editedCount, blocks } = await Article.findById(latestNews.articleId)
            //       // console.log(await Article.findById(latestNews.articleId))
            //       doc2.push({ category, title, viewsCount, _id, tags, lastUpdatedAt, editedCount, blocks })
            //     } catch (error) {
            //       console.log(error)
            //     }
            //   }
            //   i += 1
            // }
            res.json({
              code: 200,
              type: 'success',
              data: [doc, doc2]
            })
          }
        })
  },
  async getPopularArticle (req, res, next) {
    console.log('getting Popular articles')
    if (req.query.mode === MODE.DEBUG) {
      console.log('[Mock][Articles] use mock data')
      mockController.mockArticles(req, res)
      return
    }
    if (req.query.limit === undefined) {
      req.query.limit = 6 /// default value
      console.log(`default limit value : ${req.query.limit}`)
    }
    console.log(req.query.limit, '  limit')
    const keyword = req.query.q || ''

    const limit = Number(req.query.limit)
    console.log('getArticles: ' + keyword + ',' + limit, ' .......')
    Article.find(
      {
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
      },
      null,
      { limit: limit, sort: { viewsCount: -1 } }
    ).exec(async (err, doc) => {
      if (err || doc.length === 0) {
        res.status(200).send({
          code: 404,
          type: 'success',
          message: '查無搜尋結果'
        })
      } else {
        for (let i = 0; i < doc.length; i++) {
          console.log(i, doc[i].title, doc[i]._id, doc[i].viewsCount)
        }
        res.json({
          code: 200,
          type: 'success',
          data: [doc]
        })
      }
    })
  },
  async getArticlesOthers (req, res, next) {
    console.log('getting Popular articles')
    if (req.query.mode === MODE.DEBUG) {
      console.log('[Mock][Articles] use mock data')
      mockController.mockArticles(req, res)
      return
    }
    if (req.query.limit === undefined) {
      req.query.limit = 6 /// default value
      console.log(`default limit value : ${req.query.limit}`)
    }
    console.log(req.query.limit, '  limit')
    const keyword = req.query.q || ''

    const limit = Number(req.query.limit)
    console.log('getArticles: ' + keyword + ',' + limit, ' .......')
    Article.aggregate(
      [{ $sample: { size: 6 } }]
    ).exec(async (err, doc) => {
      if (err || doc.length === 0) {
        res.status(200).send({
          code: 404,
          type: 'success',
          message: '查無搜尋結果'
        })
      } else {
        for (let i = 0; i < doc.length; i++) {
          console.log(i, doc[i].title, doc[i]._id, doc[i].viewsCount, 'random')
        }
        res.json({
          code: 200,
          type: 'success',
          data: [doc]
        })
      }
    })
  },
  searchArticles (req, res, next) {
    const keyword = req.query.q || ''
    const checkQueryLimit = Number(req.query.limit)
    const limit = isNaN(checkQueryLimit) ? 20 : checkQueryLimit
    const pageNumber = isNaN(Number(req.query.page)) ? 0 : Number(req.query.page)
    const time = req.query.tbs
    const category = req.query.category.toString() || ''
    console.log('searchArticles: ' + keyword + ',' + limit + ',' + category)
    let searchQuery = {}
    if (category) {
      const searchCategoryIndex = categories.indexOf(category)
      searchQuery = searchCategoryIndex >= 0 ? { category } : {}
    }
    let timeQuery = {}
    switch (time) {
      case 'qdr:h':
        timeQuery = {
          lastUpdatedAt: { $gte: moment().subtract(1, 'hours').toDate() }
        }
        break
      case 'qdr:d':
        timeQuery = {
          lastUpdatedAt: { $gte: moment().subtract(1, 'days').toDate() }
        }
        break
      case 'qdr:w':
        timeQuery = {
          lastUpdatedAt: { $gte: moment().subtract(1, 'weeks').toDate() }
        }
        break
      case 'qdr:y':
        timeQuery = {
          lastUpdatedAt: { $gte: moment().subtract(1, 'years').toDate() }
        }
        break
      default: timeQuery = {}
        break
    }

    if (keyword) {
      Article.find(
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
        }, null, { limit: limit, skip: pageNumber > 0 ? pageNumber * 20 : 0, sort: { _id: -1 } })
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
    } else if (category) {
      Article.find(
        {
          ...searchQuery
        }, null, { limit: limit, skip: pageNumber > 0 ? pageNumber * 20 : 0, sort: { _id: -1 } })
        .exec((err, doc) => {
          if (err || doc.length === 0) {
            console.error(err)
            res.status(200).send({
              code: 404,
              type: 'error',
              message: '查無搜尋結果'
            })
          } else {
            console.log(doc)
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
  getArticleById (req, res, next) {
    console.log('getArticleById: ' + req.params.id)
    if (!req.params.id) {
      res.status(500).send({
        code: 500,
        type: 'error',
        message: '文章的ID輸入有誤，請重新查詢'
      })
      return
    }

    Article.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } }, { new: true, upsert: true })
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
  async createArticle (req, res) {
    console.log('article/createArticle')
    try {
      const {
        token,
        isAnonymous,
        title,
        blocks,
        category,
        tags,
        citations
      } = req.body
      const createAt = new Date()

      if (!token) {
        throw new Error('登入逾時或失效')
      }
      if (!title) {
        throw new Error('請輸入文章標題')
      }
      const { uid, name } = await Utils.firebase.verifyIdToken(token)
      const newArticleId = mongoose.Types.ObjectId()
      const newArticleBlocksList = []
      const newAuthor = isAnonymous ? { uid, name: '匿名', isAnonymous } : { uid, name, isAnonymous }
      for (const block of blocks) {
        const { blockId, contentId } = await createNewBlock(block, newArticleId, newAuthor)
        block._id = blockId
        const blockAddToVersion = { blockId, contentId, revisionIndex: 0, order: 0 }
        newArticleBlocksList.push(blockAddToVersion)
      }

      // 過濾使用者傳入的陣列
      const pureCitations = []
      if (citations && Array.isArray(citations)) {
        for (const c of citations) {
          if (c.title && c.url) {
            pureCitations.push({ title: c.title, url: c.url })
          }
        }
      }

      const article = new Article({
        _id: newArticleId,
        title,
        tags,
        authors: [newAuthor],
        category,
        citations: pureCitations,
        createAt,
        blocks: blocks.map(block => ({ ...block, authors: [newAuthor] }))
      })

      const version = new Version({
        articleId: article._id,
        versions: [{
          title,
          citations: pureCitations,
          updatedAt: createAt,
          blocks: newArticleBlocksList,
          author: newAuthor,
          versionIndex: 1
        }]
      })
      const latestNews = new LatestNews({
        articleId: newArticleId,
        updatedAt: createAt
      })
      // 更新最新新聞
      const latestNewsCount = await LatestNews.find({})
      if (latestNewsCount.length >= 10) {
        await LatestNews.findByIdAndDelete(latestNewsCount[0]._id)
      }
      await latestNews.save()
      await version.save()
      await article.save().then(result => {
        res.status(200).send({
          code: 200,
          type: 'success',
          message: '成功發布新文章',
          id: result.id
        })
        Utils.firebase.storeEditArticleRecord(uid, result.id)
        Utils.firebase.handleAddUserPoints(uid, 5)
        return Promise.resolve()
      }).catch(error => {
        res.status(200).send({
          code: 500,
          type: 'error',
          message: error.message
        })
        return Promise.reject(error)
      })
    } catch (error) {
      console.log(error)
      res.status(200).send({
        code: 500,
        type: 'error',
        message: error.message
      })
    }
  },
  async updateArticleById (req, res, next) {
    console.log('updateArticleById: ' + req.body.id)
    try {
      const { id, token, isAnonymous } = req.body
      console.log(typeof isAnonymous)
      const { uid, name } = await Utils.firebase.verifyIdToken(token)
      const newAuthor = isAnonymous ? { uid, name: '匿名', isAnonymous } : { uid, name, isAnonymous }
      var article = await Article.findById(id).lean()
      if (article === undefined) {
        res.status(200).send({
          code: 500,
          type: 'error',
          message: '文章的ID輸入有誤，請重新查詢'
        })
      } else {
        let checkIfChange = false
        const updateObj = req.body
        updateObj.authors = getUpdatedAuthors(updateObj.authors, newAuthor)
        updateObj.lastUpdatedAt = Date.now()
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
            if (Utils.diff.compareContent(block.content, articleBlock.content)) {
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
                author: newAuthor,
                revisionIndex: newBlock.revisions.length + 1
              })
              newBlock.authors = getUpdatedAuthors(newBlock.authors, newAuthor)
              updateObj.blocks[index].authors = getUpdatedAuthors(newBlock.authors, newAuthor)
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
                author: newAuthor,
                revisionIndex: newBlock.revisions.length + 1
              })
              newBlock.authors = getUpdatedAuthors(newBlock.authors, newAuthor)
              updateObj.blocks[index].authors = getUpdatedAuthors(newBlock.authors, newAuthor)
              await newBlock.save()

              latestVersionBlocksList.push({
                blockId: block._id,
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
            const { blockId, contentId } = await createNewBlock(block, article._id, newAuthor)
            block._id = blockId
            latestVersionBlocksList.push({
              blockId,
              contentId,
              revisionIndex: 0,
              order: 0,
              authors: [newAuthor]
            })
          }
        }

        // 檢查是否有更新新聞引用
        // 過濾使用者傳入的陣列
        const pureCitations = []
        const citations = req.body.citations
        if (citations && Array.isArray(citations)) {
          for (const c of citations) {
            if (c.title && c.url) {
              pureCitations.push({ title: c.title, url: c.url })
            }
          }
        }
        let onlyTagChange = false
        // 確認是否有變更標題或是引用
        if (!checkIfChange) {
          console.log('The content has not change in article, detect other changes')
          const detectArticle = await Article.findOne({ _id: id })
          if (detectArticle.title !== updateObj.title) {
            console.log('title is changed')
            checkIfChange = true
          }
          if (detectArticle.citations.length !== pureCitations.length) {
            console.log('citations has changed')
            checkIfChange = true
          } else {
            const result = pureCitations.every((element, index) => {
              return element.url === detectArticle.citations[index].url &&
              element.title === detectArticle.citations[index].title
            })
            console.log('compare citations result', result)
            if (!result) {
              console.log('citations length is same, but element has changed')
              checkIfChange = true
            }
          }
          // 確認是否有block被刪除
          for (const block of detectArticle.blocks) {
            let blockDeleted = true
            for (const compareblock of updateObj.blocks) {
              if (block._id.toString() === compareblock._id.toString()) {
                blockDeleted = false
                break
              }
            }
            if (blockDeleted) {
              console.log('block has been deleted')
              checkIfChange = true
              break
            }
          }
          // 確認tag是否被改動
          if (JSON.stringify(detectArticle.tags) !== JSON.stringify(updateObj.tags)) {
            onlyTagChange = true
          }
        }
        console.log(onlyTagChange)
        console.log(`The article has ${checkIfChange ? '' : 'not'} changed`)
        if (checkIfChange) {
          const oldArticle = await Article.findOne({ _id: id })
          const { addedWordCount, deletedWordCount } = await compareArticleByWord(updateObj, oldArticle)
          const currentVersion = articleVersion.versions.length + 1
          articleVersion.versions.push({
            citations: pureCitations,
            title: req.body.title,
            author: newAuthor,
            updatedAt: new Date(),
            blocks: latestVersionBlocksList,
            versionIndex: currentVersion,
            wordsChanged: {
              added: addedWordCount,
              deleted: deletedWordCount
            }
          })
          await Version.findOneAndUpdate({ articleId: article._id }, articleVersion, { new: true, upsert: true })
          const latestNews = new LatestNews({
            articleId: article._id,
            updatedAt: new Date()
          })
          // 更新最新新聞
          const latestNewsCount = await LatestNews.find({})
          var repeatLatestNewsFlag = Boolean(false)
          for (const news of latestNewsCount) {
            if (String(news.articleId) === String(latestNews.articleId)) {
              await LatestNews.findOneAndDelete({ articleId: news.articleId })
              repeatLatestNewsFlag = true
              break
            }
          }
          if (repeatLatestNewsFlag === false) {
            if (latestNewsCount.length >= 10) {
              await LatestNews.findByIdAndDelete(latestNewsCount[0]._id)
            }
          }
          await latestNews.save()

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
            console.log(Utils.article)
            Utils.article.updateArticleEditedCount(id)
            Utils.firebase.storeEditArticleRecord(uid, id)
            Utils.firebase.handleAddUserPoints(uid, 2)
          })
        } else if (onlyTagChange) {
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
            // console.log(Utils.article)
            // Utils.article.updateArticleEditedCount(id)
            // Utils.firebase.storeEditArticleRecord(uid, id)
            // Utils.firebase.handleAddUserPoints(uid, 2)
          })
        } else {
          res.status(200).send({
            code: 500,
            type: 'error',
            message: '文章內容與前一版本相符，故無法更新'
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
  async getArticleAuthors (req, res, next) {
    try {
      const articleId = req.params.id
      const doc = await Article.findById(articleId).exec()
      const authors = []
      for (const author of doc.authors) {
        const { displayName } = await Utils.firebase.getUserInfoById(author.uid)
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
  // async getPopularArticle (req, res, next) {
  //   const latestNewsCount = await LatestNews.find({}).sort({ _id: -1 })
  //   const doc = []
  //   var i = 0
  //   for (const latestNews of latestNewsCount) {
  //     if (i <= 6) {
  //       const { category, title, viewsCount } = Article.findById(latestNews.articleId)
  //       doc.push({ category, title, viewsCount })
  //     }
  //     i += 1
  //   }
  //   res.status(200).send({
  //     code: 200,
  //     type: 'success',
  //     data: doc
  //   })
  // },
  async getArticleAuthorsImg (req, res, next) {
    console.log('article/getArticleAuthors.....')
    try {
      const articleId = req.params.id
      const authorsData = await getOrSetCache(`ArticleId:${articleId}_AuthorsImg`, async () => {
        const doc = await Article.findById(articleId).exec()
        const authors = []
        for (const author of doc.authors) {
          const { displayName, photoURL, email } = await Utils.firebase.getUserInfoById(
            author.uid
          )
          authors.push({ uid: author.uid, displayName: displayName, photoURL: photoURL, email: email, isAnomynous: author.isAnonymous })
        }
        return authors
      })

      res.status(200).send({
        code: 200,
        type: 'success',
        data: authorsData,
        message: '已成功抓取作者'
      })
    } catch (error) {
      console.log(error)
    }
  },
  async putDeleteArticleById (req, res, next) {
    try {
      const { id } = req.body
      const deletedArticle = await Article.findById(id)
      if (deletedArticle === undefined) {
        return res.status(200).send({
          code: 500,
          type: 'error',
          message: '文章的ID輸入有誤，請重新查詢'
        })
      }

      // 刪除  ../models/article.js    的  articleSchema  // 還有  blockSchema    (增加刪除標記)
      deletedArticle.blocks.forEach((block, index) => {
        if (block.blockDateTime == null) {
          console.log(
            'blockDateTime bug  就算沒有打blockDatetime 也可以發布新block'
          )
          block.blockDateTime = Date.now() // default 把 block date time設定為現在
        }
        block.isdeleted = true
      })
      deletedArticle.isdeleted = true

      await deletedArticle.save()

      const allArticleblocks = await Block.find({ articleId: id })

      // 刪除    ../models/block.js    的blockSchema   //  還有  block 裡面的 revision schema
      allArticleblocks.forEach(async (block, blockIndex) => {
        block.isdeleted = true
        block.revisions.forEach(async (rev, revIndex) => {
          rev.isdeleted = true
        })
        await block.save()
      })
      // 刪除../models/content.js 的 content schema
      const allContents = await Content.find({ articleId: id })
      allContents.forEach(async (content, contentIndex) => {
        content.isdeleted = true
        await content.save()
      })
      // latestNews
      const allLatest = await LatestNews.find({ articleId: id })
      allLatest.forEach(async (latest, Index) => {
        latest.isdeleted = true
        await latest.save()
      })

      // version
      const allVersion = await Version.find({ articleId: id })
      console.log(allVersion, ' allv')
      allVersion.forEach(async (ver, verIndex) => {
        ver.versions.forEach((v2, v2Index) => {
          v2.blocks.forEach((v3, v3Index) => {
            console.log(v3, `  v33 ${v3Index}`)
            v3.isdeleted = true
          })
          v2.isdeleted = true
        })
        ver.isdeleted = true
        await ver.save()
      })
      return res.status(200).send({
        test: '軟刪除成功'
      })
    } catch (error) {
      console.log(error)
      res.status(200).send({
        code: 500,
        type: 'error',
        message: error.message
      })
    }
  },
  async deleteArticleById (req, res, next) {
    try {
      const { id } = req.body
      const article = await Article.findOne({ _id: id })
      await Article.deleteOne({ _id: id })

      await Block.deleteMany({ articleId: id })
      await Content.deleteMany({ articleId: id })
      await LatestNews.deleteMany({ articleId: id })
      await Version.deleteMany({ articleId: id })

      return res.status(200).send({
        test: `硬刪除成功 articleid: ${id} ${article.title}`
      })
    } catch (error) {
      console.log(error)
      res.status(200).send({
        code: 500,
        type: 'error',
        message: error.message
      })
    }
  }
}

async function getOrSetCache (key, cb) {
  const freshData = await cb()
  return freshData
  // return new Promise((resolve, reject) => {
  //   redisClient.get(key, async (error, data) => {
  //     if (error) {
  //       return reject(error)
  //     }
  //     if (data != null) {
  //       console.log('Cache Hit')
  //       return resolve(JSON.parse(data))
  //     }
  //     console.log('Cache Miss')
  //     const freshData = await cb()
  //     redisClient.setex(key, DEFAULT_EXPIRATION, JSON.stringify(freshData))
  //     resolve(freshData)
  //   })
  // })
}

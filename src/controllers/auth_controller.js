const firebase = require('../lib/firebase')
const admin = require('firebase-admin')
const Article = require('../models/article')
const Utils = require('../utils')
// require mongoose for casting string into ObjectId
const mongoose = require('mongoose')

const auth = {
  async login (req, res, next) {
    try {
      const token = req.body.idToken
      const { uid } = await Utils.firebase.verifyIdToken(token)
      console.log('login uid: ' + uid)
      firebase.db.collection('users').doc(uid).set(req.body, { merge: true })
      res.status(200).send({
        code: 200,
        type: 'success',
        message: '已成功登入'
      })
    } catch (error) {
      console.log(error)
      res.status(200).send({
        code: 403,
        type: 'error',
        message: error.message
      })
    }
  },
  async getProfileById (req, res) {
    console.log('auth/getProfileById')
    const token = req.body.token
    try {
      const { uid } = await Utils.firebase.verifyIdToken(token)
      const userRef = firebase.db.collection('articles').doc(uid)
      const doc = await userRef.get()
      if (!doc.exists) {
        res.json({
          code: 200,
          type: 'success',
          data: {}
        })
      } else {
        const subscribedList = doc.get('subscribed') || []
        const originalNotificationsList = await Utils.firebase.getNotificationsByUid(uid)
        console.log(originalNotificationsList)
        const queryArray = subscribedList.map(s => s.articleId)
        const result = await Article.find({ _id: { $in: queryArray } })
        const newUpdatedArticlesList = []
        for (const subscribed of subscribedList) {
          console.log(`check ${subscribed.articleId} in database`)
          const article = result.find(r => r._id.toString() === subscribed.articleId)
          console.log(subscribed.timeStamp, subscribed.timeStamp.toDate())
          if (!article) {
            // ArticleId is not found in database, skip
            console.log(`skip ${subscribed.articleId}, not found`)
            continue
          }
          console.log(subscribed.timeStamp.toDate(), article.lastUpdatedAt, subscribed.timeStamp.toDate() < article.lastUpdatedAt)
          if (subscribed.timeStamp && article.lastUpdatedAt && subscribed.timeStamp.toDate() < article.lastUpdatedAt) {
            console.log('found article updated')
            newUpdatedArticlesList.push({ articleId: subscribed.articleId, type: 'update', lastUpdatedAt: article.lastUpdatedAt, title: article.title })
          }
        }

        newUpdatedArticlesList.sort((a, b) => a.lastUpdatedAt - b.lastUpdatedAt)
        let notifications = [...originalNotificationsList, ...newUpdatedArticlesList]
        console.log(notifications)

        if (newUpdatedArticlesList.length > 0) {
          notifications = await Utils.firebase.handleStoreNotifications(uid, newUpdatedArticlesList)
        }

        res.json({
          code: 200,
          type: 'success',
          data: {
            articles: doc.data(),
            notifications
          }
        })
      }
    } catch (error) {
      console.log(error)
      res.status(500).send({
        code: 500,
        type: 'error',
        data: error
      })
    }
  },
  async updateViewArticleToFirestore (req, res) {
    console.log('auth/updateViewArticleToFirestore')
    const { token, articleId } = req.body
    try {
      const { uid } = await Utils.firebase.verifyIdToken(token)
      const userRef = firebase.db.collection('articles').doc(uid)
      const doc = await userRef.get()
      if (!doc.exists) {
        userRef
          .set({
            viewed: [articleId]
          }, { merge: true })
      } else {
        userRef.update({
          viewed: admin.firestore.FieldValue.arrayUnion(articleId)
        })
      }

      res.json({
        code: 200,
        type: 'success',
        message: '已更新瀏覽記錄'
      })
    } catch (error) {
      console.log(error)
      res.status(500).send({
        code: 500,
        type: 'error',
        data: error
      })
    }
  },
  async subscribeArticleById (req, res) {
    try {
      const { articleId, token, subscribe } = req.body
      if (!token) {
        throw new Error('token 輸入有誤')
      }
      const { uid } = await Utils.firebase.verifyIdToken(token)
      const data = await Utils.firebase.handleSubscribeArticleById(uid, articleId, subscribe === true)
      res.json({
        code: 200,
        type: 'success',
        message: '已成功修改追蹤',
        data: data
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
  getArticlesInfo
}

async function getArticlesInfo (req, res) {
  console.log('auth/getArticlesInfo')
  const { token } = req.body
  try {
    const { uid } = await Utils.firebase.verifyIdToken(token)
    const userRef = firebase.db.collection('articles').doc(uid)
    const points = await Utils.firebase.handleGetUserPoints(uid)
    const doc = await userRef.get()
    if (doc.exists) {
      const editedList = doc.data().edited || []
      const viewedList = doc.data().viewed || []
      const subscribedList = doc.data().subscribed || []
      const editedArticleIds = editedList.map(edited => edited.articleId)
      const viewedArticleIds = viewedList
      const subscribedArticleIds = subscribedList.map(subscribed => subscribed.articleId)
      const q = handleGetArticlesByArray
      const result = await Promise.all([q(editedArticleIds), q(viewedArticleIds), q(subscribedArticleIds)])
      res.json({
        code: 200,
        type: 'success',
        data: {
          edited: result[0],
          viewed: result[1],
          subscribed: result[2],
          points
        }
      })
    } else {
      res.json({
        code: 200,
        type: 'success',
        data: {
          edited: [],
          viewed: [],
          subscribed: [],
          points: 0
        }
      })
    }
  } catch (error) {
    console.log(error)
    res.status(500).send({
      code: 500,
      type: 'error',
      error
    })
  }
}

async function handleGetArticlesByArray (articleIds) {
  try {
    // deprecated
    // const doc = await Article.find({ _id: { $in: articleIds } })

    // if articleIds is empty, the braches in switch in pipeline will be empty,
    // which cause error
    const doc = articleIds.length > 0 ? await Article.aggregate(handleBuildPipeline(articleIds)) : []
    return Promise.resolve(doc)
  } catch (error) {
    console.log(error)
    return Promise.reject(error)
  }
}

/**
 * this pipeline is aimed to fetch articles from db
 * while keep the order in array(articleIds)
 * @param articleIds
 * @returns built pipeline
 */
function handleBuildPipeline (articleIds) {
  const switchCond = {
    $switch: {
      branches: []
    }
  }

  // cast to ObjectId type first and set weight by its indexes
  articleIds.map(e => mongoose.Types.ObjectId(e)).forEach((id, index) => {
    switchCond.$switch.branches.push({
      case: { $eq: ['$_id', id] },
      then: index
    })
  })

  // match all the articles by ids,
  // add _weight field
  // sort it by _weight
  const pipeline = [
    { $match: { _id: { $in: articleIds.map(e => mongoose.Types.ObjectId(e)) } } },
    { $addFields: { _weight: switchCond } },
    { $sort: { _weight: 1 } }
  ]
  return pipeline
}

module.exports = auth

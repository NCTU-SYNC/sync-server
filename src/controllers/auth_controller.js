const firebase = require('../lib/firebase')
const admin = require('firebase-admin')
const Article = require('../models/article')
const Utils = require('../utils')
const moment = require('moment')
// require mongoose for casting string into ObjectId
const mongoose = require('mongoose')

const auth = {
  async login (req, res, next) {
    try {
      const token = req.body.idToken
      const { uid } = await Utils.firebase.verifyIdToken(token)
      console.log('login uid: ' + uid)
      const userRef = firebase.db.collection('users').doc(uid)
      userRef.set(req.body, { merge: true })
      const doc = await userRef.get()
      res.status(200).send({
        code: 200,
        type: 'success',
        message: '已成功登入',
        data: { nameModTime: doc.data().nameModTime }
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
  async updateDisplayName (req, res) {
    const { token, payload } = req.body

    try {
      const { uid } = await Utils.firebase.verifyIdToken(token)
      const userRef = firebase.db.collection('users').doc(uid)
      const doc = await userRef.get()
      if (!doc.exists) {
        throw new Error('No user found')
      }

      const data = doc.data()

      /* Use `admin.firestore.FieldValue.serverTimestamp()` instaed of `Date.now()` because
       * `Date.now()` is dependent on server's device time, which can be easily changed
       * by the server owner.
       *
       * Use `lastModTime_0` and `lastModTime_1` because `admin.firestore.FieldValue.serverTimestamp()`
       * cannot be used inside of an array. (`lastModTime_0` is the earliest time user
       * changed their name.)
       */
      if (Object.hasOwn(data, 'lastModTime_0')) {
        const currentTime = moment(admin.firestore.Timestamp.now())
        const lastModTime = data.lastModTime_0
        const nextAvailableTime = moment(lastModTime).add(30, 'days')

        if (nextAvailableTime.isAfter(currentTime)) {
          throw new Error(`${nextAvailableTime.toDate()}`)
        }
      } else if (Object.hasOwn(data, 'lastModTime_1')) {
        await userRef.update({
          lastModTime_0: data.lastModTime_1,
          lastModTime_1: admin.firestore.FieldValue.serverTimestamp(),
          displayName: payload.newName
        }, { merge: true })
      } else {
        await userRef.update({
          lastModTime_1: admin.firestore.FieldValue.serverTimestamp(),
          displayName: payload.newName
        }, { merge: true })
      }

      res.json({
        code: 200,
        type: 'success',
        data: {}
      })
    } catch (error) {
      res.json({
        code: 500,
        type: 'error',
        data: error.message
      })
    }
  },
  async updateNameModTime (req, res) {
    console.log('auth/getNameModTime')
    const token = req.body.token
    try {
      const { uid } = await Utils.firebase.verifyIdToken(token)
      const userRef = firebase.db.collection('users').doc(uid)
      const doc = await userRef.get()
      const data = doc.data()
      // append current time to nameModTime array
      const time = [
        // if nameModTime is not exist, set it to []
        ...(data.hasOwnProperty('nameModTime') ? data.nameModTime : []),
        moment()
      ].slice(-2)
      if (!doc.exists) {
        throw new Error('No user found')
      }
      await userRef.update({
        nameModTime: time
      }, { merge: true })

      res.json({
        code: 200,
        type: 'success',
        data: time
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
  async getPref (req, res) {
    console.log('auth/getPref')
    const token = req.body.token
    try {
      const { uid } = await Utils.firebase.verifyIdToken(token)
      const userRef = firebase.db.collection('users').doc(uid)
      const doc = await userRef.get()
      if (doc.exists) {
        res.json({
          code: 200,
          type: 'success',
          data: doc.data()
        })
      } else {
        res.json({
          code: 200,
          type: 'success',
          data: {}
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
  async getPreferences (req, res) {
    const { token } = req.query
    try {
      const { uid } = await Utils.firebase.verifyIdToken(token)
      const userRef = firebase.db.collection('preferences').doc(uid)
      const doc = await userRef.get()

      if (!doc.exists) {
        const defaultData = {
          editedNotification: false,
          isAnonymous: false,
          subscribedNotification: false
        }

        await userRef.set(defaultData, { merge: true })

        res.json({
          code: 200,
          type: 'success',
          data: defaultData
        })
        return
      }

      res.json({
        code: 200,
        type: 'success',
        data: doc.data()
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
  async updatePref (req, res) {
    console.log('auth/updateProfile')
    const { token, payload } = req.body
    try {
      const { uid } = await Utils.firebase.verifyIdToken(token)
      const userRef = firebase.db.collection('preferences').doc(uid)
      const doc = await userRef.get()
      if (!payload.hasOwnProperty('preferences')) {
        throw new Error('No preferences found in payload')
      }
      if (!doc.exists) {
        userRef.set(payload.preferences.payload, { merge: true })
      }
      await userRef.update(payload.preferences.payload, { merge: true })
      res.json({
        code: 200,
        type: 'success',
        message: '已成功更新偏好設定'
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

const firebase = require('../lib/firebase')
const admin = require('firebase-admin')

async function verifyIdToken (token) {
  try {
    const decodedToken = await firebase.admin.auth().verifyIdToken(token)
    return Promise.resolve(decodedToken)
  } catch (error) {
    if (error.code === 'auth/argument-error') {
      return Promise.reject(new Error('登入參數錯誤，請稍後再試，若仍發生問題，還請聯繫我們。'))
    } else {
      return Promise.reject(error)
    }
  }
}

async function getUserInfoById (uid) {
  const userRef = firebase.db.collection('users').doc(uid)
  const doc = await userRef.get()
  if (!doc.exists) {
    console.log('No such document!')
    return uid
  } else {
    console.log('Document data:', doc.data())
    return doc.data()
  }
}

async function storeEditArticleRecord (uid, articleId) {
  const element = {
    articleId, timeStamp: admin.firestore.Timestamp.now()
  }
  try {
    const userRef = firebase.db.collection('articles').doc(uid)
    const { exists } = await userRef.get()
    if (!exists) {
      userRef
        .set({
          edited: [element],
          subscribed: [articleId]
        }, { merge: true })
    } else {
      userRef.update({
        edited: admin.firestore.FieldValue.arrayUnion(element),
        subscribed: admin.firestore.FieldValue.arrayUnion(articleId)
      })
    }
  } catch (error) {
    console.log(error)
  }
}

async function handleSubscribeArticleById (uid, articleId, isSubscribe) {
  try {
    const userRef = firebase.db.collection('articles').doc(uid)
    const doc = await userRef.get()
    const subscribedList = doc.get('subscribed')
    const { exists } = doc
    if (!articleId) {
      return Promise.reject(new Error('請輸入正確的文章ID'))
    }
    if (isSubscribe) {
      if (!exists) {
        await userRef
          .set({
            subscribed: [articleId]
          }, { merge: true })
        return Promise.resolve([articleId])
      } else {
        await userRef.update({
          subscribed: admin.firestore.FieldValue.arrayUnion(articleId)
        })
        return Promise.resolve([...subscribedList, articleId])
      }
    } else {
      if (!exists) {
        return Promise.resolve([])
      } else {
        await userRef.update({
          subscribed: admin.firestore.FieldValue.arrayRemove(articleId)
        })
        return Promise.resolve(subscribedList.filter(id => id === articleId))
      }
    }
  } catch (error) {
    console.log(error)
    return Promise.reject(error)
  }
}

async function handleAddUserPoints (uid, point) {
  try {
    const userRef = firebase.db.collection('points').doc(uid)
    const doc = await userRef.get()
    const points = doc.get('points')
    const { exists } = doc
    if (!exists) {
      await userRef
        .set({
          points: point
        }, { merge: true })
      return Promise.resolve(point)
    } else {
      await userRef.update({
        points: points + point
      })
      return Promise.resolve(points + point)
    }
  } catch (error) {
    console.log(error)
    return Promise.reject(error)
  }
}

async function handleGetUserPoints (uid) {
  try {
    const userRef = firebase.db.collection('points').doc(uid)
    const doc = await userRef.get()
    const points = doc.get('points')
    const { exists } = doc
    if (!exists) {
      return Promise.resolve(0)
    } else {
      return Promise.resolve(points)
    }
  } catch (error) {
    console.log(error)
    return Promise.reject(error)
  }
}

module.exports = {
  verifyIdToken,
  getUserInfoById,
  storeEditArticleRecord,
  handleSubscribeArticleById,
  handleAddUserPoints,
  handleGetUserPoints
}

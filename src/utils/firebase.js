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
    const doc = await userRef.get()
    const editedList = doc.get('edited') || []
    const subscribedList = doc.get('subscribed') || []
    const { exists } = await userRef.get()
    if (!exists) {
      userRef
        .set({
          edited: [element],
          subscribed: [articleId]
        }, { merge: true })
    } else {
      // Replace or push element in/to arrays
      const editedIndex = editedList.findIndex(s => s.articleId === articleId)
      const subscribedIndex = subscribedList.findIndex(s => s.articleId === articleId)

      if (editedIndex >= 0) {
        editedList[editedIndex] = element
      } else {
        editedList.push(element)
      }

      if (subscribedIndex >= 0) {
        subscribedList[subscribedIndex] = element
      } else {
        subscribedList.push(element)
      }

      userRef.update({
        edited: editedList,
        subscribed: subscribedList
      })
      return Promise.resolve({
        edited: editedList,
        subscribed: subscribedList
      })
    }
  } catch (error) {
    console.log(error)
    return Promise.reject(error)
  }
}

async function handleSubscribeArticleById (uid, articleId, isSubscribe) {
  const element = {
    articleId, timeStamp: admin.firestore.Timestamp.now()
  }
  try {
    const userRef = firebase.db.collection('articles').doc(uid)
    const doc = await userRef.get()
    const subscribedList = doc.get('subscribed') || []
    const { exists } = doc
    if (!articleId) {
      return Promise.reject(new Error('請輸入正確的文章ID'))
    }
    if (isSubscribe) {
      if (!exists) {
        await userRef
          .set({
            subscribed: [element]
          }, { merge: true })
        return Promise.resolve([element])
      } else {
        const index = subscribedList.findIndex(s => s.articleId === articleId)
        if (index >= 0) {
          subscribedList[index] = element
          await userRef.update({
            subscribed: subscribedList
          })
          return Promise.resolve(subscribedList)
        } else {
          await userRef.update({
            subscribed: admin.firestore.FieldValue.arrayUnion(element)
          })
          return Promise.resolve([...subscribedList, element])
        }
      }
    } else {
      if (!exists) {
        return Promise.resolve([])
      } else {
        const newList = [...subscribedList].filter(s => s.articleId !== articleId)
        await userRef.update({
          subscribed: newList
        })
        return Promise.resolve(newList)
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

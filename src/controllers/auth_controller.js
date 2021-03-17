var firebase = require('../lib/firebase')
var admin = require('firebase-admin')

const auth = {
  async login (req, res, next) {
    try {
      const token = req.body.idToken
      const uid = await auth.verifyIdToken(token)
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
  async verifyIdToken (token) {
    const decodedToken = await firebase.admin.auth().verifyIdToken(token)
    return decodedToken.uid
  },
  async getUserInfoById (uid) {
    const userRef = firebase.db.collection('users').doc(uid)
    const doc = await userRef.get()
    if (!doc.exists) {
      console.log('No such document!')
      return uid
    } else {
      console.log('Document data:', doc.data())
      return doc.data()
    }
  },
  async getArticlesInfoById (req, res) {
    console.log('auth/getArticlesInfoById')
    const token = req.body.token
    try {
      const { uid } = await firebase.admin.auth().verifyIdToken(token)
      const userRef = firebase.db.collection('articles').doc(uid)
      const doc = await userRef.get()
      if (!doc.exists) {
        res.json({
          code: 200,
          type: 'success',
          data: {}
        })
      } else {
        res.json({
          code: 200,
          type: 'success',
          data: doc.data()
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
      const { uid } = await firebase.admin.auth().verifyIdToken(token)
      const userRef = firebase.db.collection('articles').doc(uid)
      const doc = await userRef.get()
      if (!doc.exists) {
        userRef
          .set({
            viewed: [articleId]
          }, { merge: true })
        res.json({
          code: 200,
          type: 'success',
          message: '已更新瀏覽記錄'
        })
      } else {
        userRef.update({
          viewed: admin.firestore.FieldValue.arrayUnion(articleId)
        })
        res.json({
          code: 200,
          type: 'success',
          message: '已更新瀏覽記錄'
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

  async subscribeArticleById (req, res) {
    const { articleId, token, subscribe } = req.body
    const { uid } = await firebase.admin.auth().verifyIdToken(token)
    try {
      const userRef = firebase.db.collection('articles').doc(uid)
      const { exists } = await userRef.get()
      if (subscribe === true) {
        if (!exists) {
          await userRef
            .set({
              subscribed: [articleId]
            }, { merge: true })
          res.json({
            code: 200,
            type: 'success',
            message: '已成功更新加入追蹤'
          })
        } else {
          await userRef.update({
            subscribed: admin.firestore.FieldValue.arrayUnion(articleId)
          })
          res.json({
            code: 200,
            type: 'success',
            message: '已成功加入追蹤'
          })
        }
      } else if (subscribe === false) {
        if (!exists) {
          await userRef
            .set({
              subscribed: [articleId]
            }, { merge: true })
          res.json({
            code: 200,
            type: 'success',
            message: '已成功取消追蹤'
          })
        } else {
          await userRef.update({
            subscribed: admin.firestore.FieldValue.arrayRemove(articleId)
          })
          res.json({
            code: 200,
            type: 'success',
            message: '已成功取消追蹤'
          })
        }
      }
    } catch (error) {
      console.log(error)
      res.status(500).send({
        code: 500,
        type: 'error',
        message: error.message
      })
    }
  }

}

module.exports = auth

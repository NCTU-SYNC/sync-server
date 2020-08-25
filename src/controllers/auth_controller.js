var firebase = require('../lib/firebase')
var admin = require('firebase-admin')

const auth = {
  async login (req, res, next) {
    try {
      console.log(req.body)
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
  async storeArticleIdToFirestore (req, res, next) {
    const { uid, articleId } = req.body
    console.log(uid)
    const userRef = firebase.db.collection('users').doc(uid)
    userRef.update({
      editPostIds: admin.firestore.FieldValue.arrayUnion(articleId)
    })
      .then(result => res.status(200).send({
        code: 200,
        type: 'success'
      }))
      .catch(err => console.log(err))
  }
}

module.exports = auth

var firebase = require('../lib/firebase')

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
  }
}

module.exports = auth

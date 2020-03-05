var firebase = require('../lib/firebase')

const auth = {
  async login (req, res, next) {
    try {
      const token = req.body.idToken
      const uid = await auth.verifyIdToken(token)
      console.log('login uid: ' + uid)
      firebase.db.collection('users').doc(uid).set(req.body)
      res.status(200).send({
        code: 200,
        type: 'success',
        message: '已成功登入'
      })
    } catch (error) {
      console.log(error)
      res.status(403).send({
        code: 403,
        type: 'error',
        message: error.message
      })
    }
  },
  async verifyIdToken (token) {
    const decodedToken = await firebase.admin.auth().verifyIdToken(token)
    return decodedToken.uid
    // 與下方程式碼完全相同效果
    /*
    return firebase.admin.auth().verifyIdToken(token)
      .then(function (decodedToken) {
        const uid = decodedToken.uid
        return uid
      }).catch(function (error) {
        return error
      })
    */
  }
}

module.exports = auth

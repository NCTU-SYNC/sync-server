var admin = require('firebase-admin')

var serviceAccount = require('../../config/newssync-d9aee-firebase-adminsdk-kg93z-f06ed4c1ab.json')

var app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://newssync-d9aee.firebaseio.com'
})

const db = admin.firestore()

var firebase = {
  admin: app,
  db: db
}

module.exports = firebase

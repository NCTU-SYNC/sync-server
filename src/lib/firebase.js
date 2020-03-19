var admin = require('firebase-admin')

var serviceAccount = require('../../config/syncnews-357fc-firebase-adminsdk-bpfov-da01bded6c.json')

var app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://syncnews-357fc.firebaseio.com'
})

const db = admin.firestore()

var firebase = {
  admin: app,
  db: db
}

module.exports = firebase

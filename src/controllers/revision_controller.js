var firebase = require('../lib/firebase')
var admin = require('firebase-admin')
var Article = require('../models/article')
var Block = require('../models/block')
var Content = require('../models/content')
const auth = require('../controllers/auth_controller')
const diff = require('../controllers/diff_controller')

// const mongoose = require('mongoose')
const jsonpatch = require('fast-json-patch')
const mongoose = require('mongoose')
const ObjectId = require('mongodb').ObjectId;

module.exports = {
  getArticleRevisionById (req, res, next) {
  	console.log('testtest')
    console.log('getArticleRevisionById: ' + req)
    console.log('testtest')
    
    Article
      .findById(req.params.id)
      .exec(
        async (err, doc) => {	
          if (err) {
            res.status(500).send({
              code: 500,
              type: 'error',
              message: '文章的ID輸入有誤，請重新查詢'
            })
          } else {
            res.json({
              code: 200,
              type: 'success',
              data: doc
            })
          }
        })
  }
}  
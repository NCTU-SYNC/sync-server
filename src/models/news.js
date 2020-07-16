const mongoose = require('mongoose')
const Schema = mongoose.Schema
const ObjectId = Schema.ObjectId

const newsSchema = new mongoose.Schema({
  newsId: ObjectId,
  title: String,
  timeStamp: {
    type: Date,
    default: Date.now
  },
  outline: String
})

const news = mongoose.model('News', newsSchema, 'News')
module.exports = news

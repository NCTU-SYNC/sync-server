const mongoose = require('mongoose')
const Schema = mongoose.Schema
const ObjectId = Schema.ObjectId

const latestNewsSchema = new mongoose.Schema({
  articleId: {
    type: ObjectId,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

const latestNews = mongoose.model('latestNews', latestNewsSchema, 'latestNews')
module.exports = latestNews

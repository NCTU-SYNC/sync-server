const mongoose = require('mongoose')
const Schema = mongoose.Schema

const contentSchema = new mongoose.Schema({
  blockId: {
    type: Schema.ObjectId,
    required: true
  },
  articleId: {
    type: Schema.ObjectId,
    required: true
  },
  content: {
    type: Object
  }
})

const content = mongoose.model('Content', contentSchema, 'Content')
module.exports = content

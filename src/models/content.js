const mongoose = require('mongoose')
const Schema = mongoose.Schema

ObjectId = Schema.ObjectId

const contentSchema = new mongoose.Schema({
  contentId: {
    type: ObjectId,
    required: true
  },
  blockId: {
    type: ObjectId,
    required: true
  },
  articleId: {
    type: ObjectId,
    required: true
  },
  content: {
    type: Object
  }
})

const content = mongoose.model('Content', contentSchema, 'Content')
module.exports = content

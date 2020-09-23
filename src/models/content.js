const mongoose = require('mongoose')
const Schema = mongoose.Schema

const contentSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  blockId: {
    type: Number,
    required: true
  },
  articleId: {
    type: Number,
    required: true
  },
  content: {
    type: Object
  }
})

const content = mongoose.model('Content', blockSchema, 'Content')
module.exports = content

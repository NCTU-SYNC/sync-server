const mongoose = require('mongoose')
const Schema = mongoose.Schema

const blockSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  blockTitle: {
    type: String,
    required: true
  },
  blockDateTime: {
    type: Date,
    required: true
  },
  content: {
    type: Object
  },
  authors: {
    type: Array,
    required: true
  }
})

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  tags: {
    type: Array,
    default: []
  },
  authors: {
    type: Array,
    require: true,
    default: []
  },
  category: {
    type: Array,
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  editingCount: {
    type: Number,
    default: 0
  },
  editedCount: {
    type: Number,
    default: 1
  },
  viewsCount: {
    type: Number,
    default: 1
  },
  blocks: [blockSchema]
})

const article = mongoose.model('Article', articleSchema, 'Articles')
module.exports = article

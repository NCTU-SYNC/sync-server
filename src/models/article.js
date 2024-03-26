const mongoose = require('mongoose')

const blockSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  blockTitle: {
    type: String,
    required: true
  },
  blockDateTime: {
    type: Date,
    required: false
  },
  timeEnable: {
    type: Boolean
  },
  content: {
    type: Object
  },
  authors: {
    type: Array,
    required: true
  },
  isdeleted: {
    type: Boolean,
    default: false
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
    type: String,
    default: ''
  },
  citations: [],
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
    default: 0
  },
  blocks: [blockSchema],
  isdeleted: {
    type: Boolean,
    default: false
  }
})

const article = mongoose.model('Article', articleSchema, 'Articles')
module.exports = article

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
    required: true
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
  }
})

const feedSchema = new mongoose.Schema({
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
  isSpotlight: {
    type: Boolean,
    default: false
  },
  isWaitEditing: {
    type: Boolean,
    default: false
  },
  isdeleted: {
    type: Boolean,
    default: false
  },
  isForDummies: {
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
  blocks: [blockSchema]
})

const feed = mongoose.model('Feed', feedSchema, 'Articles')
module.exports = feed

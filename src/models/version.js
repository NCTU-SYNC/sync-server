const mongoose = require('mongoose')
const Schema = mongoose.Schema
const ObjectId = Schema.ObjectId

const blockSchema = new mongoose.Schema({
  blockId: {
    type: ObjectId,
    required: true
  },
  contentId: {
    type: ObjectId,
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  revisionIndex: {
    type: Number,
    required: true
  },
  authors: {
    type: Array,
    required: true
  }
})

const versionSchema = new mongoose.Schema({
  articleId: {
    type: ObjectId,
    required: true
  },
  versions: [{
    title: {
      type: String,
      required: true
    },
    updatedAt: {
      type: Date,
      required: true
    },
    blocks: [blockSchema],
    author: {
      type: Object,
      required: true
    }
  }]
})

const version = mongoose.model('Version', versionSchema, 'Versions')
module.exports = version

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
    },
    citations: [],
    versionIndex: {
      type: Number,
      required: true
    },
    wordsChanged: {
      added: {
        type: Number,
        default: 0
      },
      deleted: {
        type: Number,
        default: 0
      }
    }
  }]
})

const version = mongoose.model('Version', versionSchema, 'Versions')
module.exports = version

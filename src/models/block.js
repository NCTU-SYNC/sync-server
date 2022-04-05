const mongoose = require('mongoose')
const Schema = mongoose.Schema
const ObjectId = Schema.ObjectId

const revisionSchema = new mongoose.Schema({
  updatedAt: {
    type: Date,
    required: true
  },
  contentId: {
    type: ObjectId,
    required: true
  },
  blockTitle: {
    type: String,
    required: true
  },
  author: {
    type: Object,
    require: true
  },
  revisionIndex: {
    type: Number,
    required: true
  },
  isdeleted: {
    type: Boolean,
    default: false,
  },
})

const blockSchema = new mongoose.Schema({
  blockId: {
    type: ObjectId,
    required: true
  },
  articleId: {
    type: ObjectId,
    required: true
  },
  authors: {
    type: Array,
    required: true
  },
  revisions: [revisionSchema],
  isdeleted: {
    type: Boolean,
    default: false,
  },
})

const block = mongoose.model('Block', blockSchema, 'Blocks')
module.exports = block

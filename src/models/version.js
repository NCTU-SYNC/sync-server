const mongoose = require('mongoose')
const Schema = mongoose.Schema

ObjectId = Schema.ObjectId

const blockSchema = new mongoose.Schema({
  contentId: {
    type: ObjectId,
    required: true
  },
  order: {
    type: Number,
    required: true
  }
})

const versionSchema = new mongoose.Schema({
  version: {
    type: Number,
    required: true
  },
  articleId: {
    type: ObjectId,
    required: true
  },
  blocks: [blockSchema]
})

const version = mongoose.model('Version', blockSchema, 'Versions')
module.exports = version

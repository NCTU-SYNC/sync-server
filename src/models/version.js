const mongoose = require('mongoose')
const Schema = mongoose.Schema

ObjectId = Schema.ObjectId

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
  }
})

const blocksSchema = new mongoose.Schema({
  blocks: [blockSchema]
})

const versionSchema = new mongoose.Schema({
  articleId: {
    type: ObjectId,
    required: true
  },
  version: [blocksSchema]
})

const version = mongoose.model('Version', versionSchema, 'Version')
module.exports = version

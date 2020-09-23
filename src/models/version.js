const mongoose = require('mongoose')
const Schema = mongoose.Schema

const blockSchema = new mongoose.Schema({
  blockId: {
    type: Number,
    required: true
  },
  revisionId: {
    type: Number,
    required: true
  },
})

const versionSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  articleId: {
    type: Number,
    required: true
  },
  blocks: [blockSchema]
})

const version = mongoose.model('Version', blockSchema, 'Versions')
module.exports = version

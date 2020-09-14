const mongoose = require('mongoose')
const Schema = mongoose.Schema

const revisionSchema = new mongoose.Schema({
  block_id: {
    type: Number,
    required: true
  },
  blockTitle: {
    type: String,
    require: true
  },
  blockDateTime: {
    type: Date,
    required: true
  },
  content: {
    type: Object
  },
  blockRevision: {
    type: Number,
    required: true
  }
})

const revision = mongoose.model('Revision', revisionSchema, 'revision')
module.exports = revision

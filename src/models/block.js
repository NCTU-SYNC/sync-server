const mongoose = require('mongoose')
const Schema = mongoose.Schema

const blockSchema = new mongoose.Schema({
  blockId: {
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
    type: String
    required: true
  },
  blockRevision: {
    type: Number,
    required: true
  }
  author: {
    type: Array,
    require: true,
    default: []
  },
})

const block = mongoose.model('Block', blockSchema, 'Blocks')
module.exports = block

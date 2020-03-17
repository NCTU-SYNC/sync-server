const mongoose = require('mongoose')
const Schema = mongoose.Schema

const blocksSchema = new Schema({
  type: {
    type: String,
    required: true,
    validate: {
      validator: (v) => {
        return /unstyled|title|subtitle|atomic/.test(v)
      },
      message: (props) => `${props.value} 為錯誤的類型`
    }
  },
  text: String,
  entityRanges: [
    {
      key: Number,
      offset: Number,
      length: Number
    }
  ]
})

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  category: [],
  createdAt: {
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
  content: {
    category: String,
    tags: [String],
    blocks: [blocksSchema],
    entityMap: {},
    timeStamp: {
      type: Date,
      default: Date.now
    }
  }

})

const article = mongoose.model('Article', articleSchema, 'Articles')
module.exports = article

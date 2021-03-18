const Article = require('../models/article')

function updateArticleEditedCount (articleId) {
  Article.findOneAndUpdate({ _id: articleId }, { $inc: { editedCount: 1 } }, { new: true, upsert: true }, (err, doc) => {
    if (err) {
      console.log(err)
    } else {
      console.log(doc)
      console.log('已更新', articleId)
    }
  })
}

module.exports = {
  updateArticleEditedCount
}

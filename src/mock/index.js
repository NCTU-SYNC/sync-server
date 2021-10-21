const mockArticlesData = require('./mock-data/articles.json')

module.exports = {
  mockArticles (req, res) {
    res.json(mockArticlesData)
  }
}

const Article = require('../models/article')
const Block = require('../models/block')
const Version = require('../models/version')
const Content = require('../models/content')
const findVersionArticleById = (articleId) => {
  return Article.findById(articleId).exec()
}

module.exports = {
  async getArticleVersionById (req, res, next) {
    console.log(`getArticleVersionById: ${req.params.id}, versionIndex: ${req.query.versionIndex}`)
    const articleId = req.params.id
    const versionInstance = await Version.findOne({ articleId: req.params.id })
    let versionIndex = req.query.versionIndex
    // TODO: parseInt and check isNaN
    const versionsCount = versionInstance.versions.length - 1
    if (versionIndex === undefined || versionIndex > versionsCount || versionIndex < 0) {
      versionIndex = versionsCount
    }
    const currentViewVersion = versionInstance.versions[versionIndex]
    const currentContent = []
    for (const block of currentViewVersion.blocks) {
      // get content which under contentInstance
      const { content, blockId, _id } = await Content.findOne({ _id: block.contentId })
      const currentBlock = await Block.findOne({ blockId })
      const blockInfo = currentBlock.revisions[block.revisionIndex]
      if (content) {
        currentContent.push({ content, blockId, blockInfo })
      }
    }
    const versionsData = versionInstance.versions.reverse().slice(
      Math.floor(versionIndex / 10) * 10,
      Math.ceil(versionIndex / 10) * 10
    )

    const doc = {
      currentVersion: {
        title: currentViewVersion.title,
        blocks: currentContent
      },
      versions: versionsData
    }
    res.status(200).send({
      code: 200,
      type: 'success',
      data: doc
    })
  },
  getBlockRevisionById (req, res, next) {
    console.log('getBlockRevisionById: ' + req.params.id)
    Block
      .findOne({ blockId: req.params.id })
      .exec(
        async (err, doc) => {
          if (err) {
            res.status(500).send({
              code: 500,
              type: 'error',
              message: '區塊版本的ID輸入有誤，請重新查詢'
            })
          } else {
            res.json({
              code: 200,
              type: 'success',
              data: doc
            })
          }
        })
  }
}

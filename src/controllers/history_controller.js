const Article = require('../models/article')
const Block = require('../models/block')
const Version = require('../models/version')
const Content = require('../models/content')
const { toInteger } = require('../utils/number')
const findVersionArticleById = (articleId) => {
  return Article.findById(articleId).exec()
}

module.exports = {
  async getArticleVersionById (req, res, next) {
    console.log(`getArticleVersionById: ${req.params.id}, versionIndex: ${req.query.versionIndex}`)
    // const articleId = req.params.id
    const versionInstance = await Version.findOne({ articleId: req.params.id })
    const versionIndexStr = req.query.revisionIndex
    const versionsCount = versionInstance.versions.length
    let versionIndex = toInteger(versionIndexStr, versionsCount) - 1

    if (versionIndex >= versionsCount || versionIndex <= 0) {
      versionIndex = versionsCount - 1
    }
    const currentViewVersion = versionInstance.versions[versionIndex]
    const currentContent = []
    for (const block of currentViewVersion.blocks) {
      // get content which under contentInstance
      const { content, blockId } = await Content.findOne({ _id: block.contentId })
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
  async getBlockRevisionById (req, res, next) {
    console.log('getBlockRevisionById')
    console.log('getBlockRevisionById')
    console.log('getBlockRevisionById')
    console.log(`getBlockRevisionById: ${req.params.id}, revisionIndex: ${req.query.revisionIndex}`)
    let revisionInstance
    try {
      revisionInstance = await Block.findOne({ blockId: req.params.id })
      console.log('revisionInstance', revisionInstance)
    } catch (error) {
      console.error(error)
    }
    const revisionIndexStr = req.query.revisionIndex
    const revisionsCount = revisionInstance.revisions.length
    let revisionIndex = toInteger(revisionIndexStr, revisionsCount) - 1

    if (revisionIndex >= revisionsCount || revisionIndex <= 0) {
      revisionIndex = revisionsCount - 1
    }
    // const currentViewRevision = revisionInstance.revisions[revisionIndex]
    // const currentContent = []

    // Search last 2 versions content and send them to front-end
    const targetVersionCount = 3
    const targetSearchRevisionsList = []
    for (var i = 0; i < targetVersionCount; i++) {
      const currentIndex = revisionIndex - i
      if (currentIndex < 0) {
        break
      } else {
        const currentRevision = revisionInstance.revisions[currentIndex].toObject()
        const { content } = await Content.findOne({ _id: currentRevision.contentId })
        targetSearchRevisionsList.push({ ...currentRevision, content })
      }
    }

    let revisionsData
    if (revisionIndex % 10 === 0) {
      revisionsData = revisionInstance.revisions.reverse().slice(
        revisionIndex / 10,
        (revisionIndex / 10) + 10
      )
    } else {
      revisionsData = revisionInstance.revisions.reverse().slice(
        Math.floor(revisionIndex / 10) * 10,
        Math.ceil(revisionIndex / 10) * 10
      )
    }

    const doc = {
      currentRevision: targetSearchRevisionsList,
      revisions: revisionsData
    }
    res.status(200).send({
      code: 200,
      type: 'success',
      data: doc
    })
  }
}

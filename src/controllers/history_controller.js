const Block = require('../models/block')
const Version = require('../models/version')
const Content = require('../models/content')
const { toInteger } = require('../utils/number')

module.exports = {
  async getArticleVersionById (req, res, next) {
    console.log(`getArticleVersionById: ${req.params.id}, versionIndex: ${req.query.versionIndex}`)
    // const articleId = req.params.id
    const versionInstance = await Version.findOne({ articleId: req.params.id })
    const versionIndexStr = req.query.versionIndex
    const versionsCount = versionInstance.versions.length
    let versionIndex = toInteger(versionIndexStr, versionsCount) - 1
    console.log(versionIndex, versionsCount)
    if (versionIndex >= versionsCount || versionIndex < 0) {
      versionIndex = versionsCount - 1
    }
    console.log(versionIndex)
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

    let from, to
    if (versionIndex % 10 === 0) {
      from = versionIndex / 10
      to = (versionIndex / 10) + 10
    } else {
      from = Math.floor((versionIndex + 1) / 10) * 10
      to = Math.ceil((versionIndex + 1) / 10) * 10
    }
    const versionsData = versionInstance.versions.reverse().slice(
      from, to
    )

    const doc = {
      currentVersion: {
        title: currentViewVersion.title,
        blocks: currentContent
      },
      versions: versionsData,
      from,
      to,
      length: versionsCount
    }
    res.status(200).send({
      code: 200,
      type: 'success',
      data: doc
    })
  },
  async getArticleVersionsById (req, res, next) {
    console.log(`getArticleVersionsById: ${req.params.id}, limit: ${req.query.limit}, page: ${req.query.page}`)
    // const articleId = req.params.id
    let versionInstance
    try{
      versionInstance = await Version.findOne({ articleId: req.params.id })

      const versionsCount = versionInstance.versions.length
      const versionIndex = versionsCount - 1
      const limit = toInteger(req.query.limit, 3)
      let page = toInteger(req.query.page, 1)
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
  
      if (page < 1) {
        page = 1
      }
      if (page > Math.ceil(versionsCount / limit)) {
        page = Math.ceil(versionsCount / limit)
      }
  
      const from = limit * (page - 1)
      const to = limit * page
      const versionsData = versionInstance.versions.reverse().slice(
        from, to
      )
      const doc = {
        currentVersion: {
          title: currentViewVersion.title,
          blocks: currentContent
        },
        versions: versionsData,
        from,
        to,
        page,
        limit,
        length: versionsCount
      }
      res.status(200).send({
        code: 200,
        type: 'success',
        data: doc
      })
    } catch (error) {
      return res.status(404).send({
        code: 404,
        type: 'error',
        data: 'Article ID error'
      })
    }
  },
  async getArticlesComparisonByVersionIndexes (req, res, next) {
    console.log(`getArticlesComparisonByVersionIndexes: ${req.params.id}, base: ${req.query.base}, compare: ${req.query.compare}`)
    // const articleId = req.params.id
    let versionInstance
    try{
      versionInstance = await Version.findOne({ articleId: req.params.id })
      console.log(req.query.base, req.query.compare)
  
      const versionsCount = versionInstance.versions.length
      let baseIndex = toInteger(req.query.base, versionsCount - 1) - 1
      let compareIndex = toInteger(req.query.compare, versionsCount) - 1
      const articles = []
      console.log(baseIndex, compareIndex)
      if (baseIndex < 0) baseIndex = 0
      if (compareIndex < 0) compareIndex = 0
      if (baseIndex === compareIndex) {
        compareIndex = baseIndex + 1
      }
      if (baseIndex > versionsCount - 1 || compareIndex > versionsCount - 1) {
        baseIndex = versionsCount - 2
        compareIndex = versionsCount - 1
      }
      console.log(baseIndex, compareIndex)
      let wordsChanged = {}
      for (const versionIndex of [baseIndex, compareIndex]) {
        const tempContent = []
        const tempViewVersion = versionInstance.versions[versionIndex]
        for (const block of tempViewVersion.blocks) {
          // get content which under contentInstance
          const { content, blockId } = await Content.findOne({ _id: block.contentId })
          const currentBlock = await Block.findOne({ blockId })
          const blockInfo = currentBlock.revisions[block.revisionIndex]
          if (content) {
            tempContent.push({ content, blockId, blockInfo })
          }
        }
        articles.push({
          citations: tempViewVersion.citations,
          title: tempViewVersion.title,
          author: tempViewVersion.author,
          updatedAt: tempViewVersion.updatedAt,
          versionIndex: tempViewVersion.versionIndex,
          blocks: tempContent
        })
        if (versionIndex === compareIndex) {
          wordsChanged = tempViewVersion.wordsChanged
        }
      }
  
      const title = versionInstance.versions[versionsCount - 1].title
  
      const doc = {
        articles,
        wordsChanged: wordsChanged,
        length: versionsCount,
        base: baseIndex + 1,
        compare: compareIndex + 1,
        title
      }
      res.status(200).send({
        code: 200,
        type: 'success',
        data: doc
      })
    } catch (error){
      return res.status(404).send({
        code: 404,
        type: 'error',
        data: 'Article does not have a edit history'
      })
    }
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

    if (revisionIndex >= revisionsCount || revisionIndex < 0) {
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

    let from, to
    if (revisionIndex % 10 === 0) {
      from = revisionIndex / 10
      to = (revisionIndex / 10) + 10
    } else {
      from = Math.floor((revisionIndex + 1) / 10) * 10
      to = Math.ceil((revisionIndex + 1) / 10) * 10
    }

    const revisionsData = revisionInstance.revisions.reverse().slice(
      from, to
    )

    const doc = {
      currentRevision: targetSearchRevisionsList,
      revisions: revisionsData,
      from,
      to,
      length: revisionsCount
    }
    res.status(200).send({
      code: 200,
      type: 'success',
      data: doc
    })
  }
}

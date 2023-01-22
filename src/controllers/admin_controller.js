const firebase = require('../lib/firebase')
const admin = require('firebase-admin')
const Article = require('../models/feed')
const Utils = require('../utils')
const moment = require('moment')
// require mongoose for casting string into ObjectId
const mongoose = require('mongoose')

const auth = {
  getUnion,
  getCertainUserProfile,
  banUser,
  getPoints,
}

async function handleGetArticlesByArray(articleIds) {
  try {
    // deprecated
    // const doc = await Article.find({ _id: { $in: articleIds } })

    // if articleIds is empty, the braches in switch in pipeline will be empty,
    // which cause error
    const doc = articleIds.length > 0 ? await Article.aggregate(handleBuildPipeline(articleIds)) : []
    return Promise.resolve(doc)
  } catch (error) {
    console.log(error)
    return Promise.reject(error)
  }
}

/**
 * this pipeline is aimed to fetch articles from db
 * while keep the order in array(articleIds)
 * @param articleIds
 * @returns built pipeline
 */
function handleBuildPipeline(articleIds) {
  const switchCond = {
    $switch: {
      branches: []
    }
  }

  // cast to ObjectId type first and set weight by its indexes
  articleIds.map(e => mongoose.Types.ObjectId(e)).forEach((id, index) => {
    switchCond.$switch.branches.push({
      case: { $eq: ['$_id', id] },
      then: index
    })
  })

  // match all the articles by ids,
  // add _weight field
  // sort it by _weight
  const pipeline = [
    { $match: { _id: { $in: articleIds.map(e => mongoose.Types.ObjectId(e)) } } },
    { $addFields: { _weight: switchCond } },
    { $sort: { _weight: 1 } }
  ]
  return pipeline
}

async function read(unionName) {
  const ref = firebase.db.collection(unionName)
  const targetRef = await ref.get()
  return targetRef
}

async function getUnion(req, res) {
  try {
    const array = []
    const querySnapshot = await read(req.query.unionName)
    querySnapshot.forEach((doc) => {
      array.push(doc.data())
    })
    res.json({
      code: 200,
      type: 'success',
      data: array
    })
  } catch (error) {
    console.error(error)
    res.status(500).send({
      code: 500,
      type: 'error',
      error
    })
  }
}

async function getCertainUserProfile(req, res) {
  try {
    const userRef = firebase.db.collection('articles').doc(req.body.uid)
    const points = await Utils.firebase.handleGetUserPoints(req.body.uid)
    const doc = await userRef.get()
    if (doc.exists) {
      const editedList = doc.data().edited || []
      const viewedList = doc.data().viewed || []
      const subscribedList = doc.data().subscribed || []
      const editedArticleIds = editedList.map(edited => edited.articleId)
      const viewedArticleIds = viewedList
      const subscribedArticleIds = subscribedList.map(subscribed => subscribed.articleId)
      const q = handleGetArticlesByArray
      const result = await Promise.all([q(editedArticleIds), q(viewedArticleIds), q(subscribedArticleIds)])
      res.json({
        code: 200,
        type: 'success',
        data: {
          edited: result[0],
          viewed: result[1],
          subscribed: result[2],
          points
        }
      })
    } else {
      res.json({
        code: 200,
        type: 'success',
        data: {
          edited: [],
          viewed: [],
          subscribed: [],
          points: 0
        }
      })
    }
  } catch (error) {
    console.log(error)
    res.status(500).send({
      code: 500,
      type: 'error',
      error
    })
  }
}

async function banUser(req, res){
  try {
    const decodedToken = await firebase.admin.auth().updateUser(req.body.uid, {disabled: true}).then((userRecord) => {
      // See the UserRecord reference doc for the contents of userRecord.
      console.log('Successfully updated user', userRecord.toJSON());
      res.json({
        code: 200,
        type: 'success',
        data: {
          uid: req.body.uid
        }
      })
    })
    //return Promise.resolve(decodedToken)
  } catch (error) {
    console.log(error)
    res.status(500).send({
      code: 500,
      type: 'error',
      error
    })
  }
}

async function getPoints(req, res) {
    try {
      const array = []
      const querySnapshot = await read(req.query.unionName)
      querySnapshot.forEach((doc) => {
        const id = doc.id
        const data = doc.data()
        const obj = {id: id, data: data}
        array.push(obj)
      })
      res.json({
        code: 200,
        type: 'success',
        data: array
      })
    } catch (error) {
      console.error(error)
      res.status(500).send({
        code: 500,
        type: 'error',
        error
      })
    }
  }


module.exports = auth

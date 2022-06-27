const { Client } = require('@elastic/elasticsearch')
const config = require('../../config/config')

const Elastic = new Client({
  node: config.elasticSearchUrl
})

module.exports = Elastic

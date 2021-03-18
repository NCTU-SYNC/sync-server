const diff = require('diff')

function compareContent (base, compare) {
  const result = diff.diffJson(base, compare)
  if (result.length !== 1) { return true } else { return false }
}

module.exports = {
  compareContent
}

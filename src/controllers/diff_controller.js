var jsdiff = require('diff')

const diff = {
  compareContent (text1, text2) {
    const diff = jsdiff.diffJson(text1, text2)
    if (diff.length !== 1) { return true } else { return false }
  }
}
module.exports = diff

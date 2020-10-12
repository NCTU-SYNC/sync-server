var jsdiff = require('diff')
const diff = {
  async compareContent (text1, text2) {
  	var diff = jsdiff.diffJson(text1, text2)
  	if (diff.length != 1)
  		return true
  	else
  		return false
  }

}
module.exports = diff
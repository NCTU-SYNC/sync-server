var jsdiff = require('diff')
const same = {
  async compareContent (text1, text2) {
  	var diff = jsdiff.diffSentences(text1, text2)
  	if (diff.length == 1)
  		return true
  	else
  		return false
  	console.log("AAAAAAAAAAA")
  	console.log(diff.length)
  	console.log("AAAAAAAAAAA")
  }

}
module.exports = same
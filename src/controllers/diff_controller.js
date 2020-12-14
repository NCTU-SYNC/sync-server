var jsdiff = require('diff')

const diff = {
  async compareContent (text1, text2) {
  	var diff = jsdiff.diffJson(text1, text2)
    const diffChar = jsdiff.diffChars(text2['content'][0]['content'][0]['text'], text1['content'][0]['content'][0]['text'])
    console.log("444444")
    //console.log(text1['content'][0]['content'][0]['text'],text2['content'][0]['content'][0]['text'])
    console.log(diffChar)
    console.log("BBBBBB")
  	if (diff.length != 1)
  		return true
  	else
  		return false
  }

}
module.exports = diff
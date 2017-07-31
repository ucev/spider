const readline = require('readline')

function getInt (prompt = '') {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  return new Promise((resolve, reject) => {
    rl.question(prompt, (answer) => {
      rl.close()
      var index = parseInt(answer)
      if (isNaN(index)) {
        reject(new Error('输入字符不是数字'))
      }
      resolve(index)
    })
  })
}

module.exports = getInt

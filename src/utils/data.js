const fs = require('fs')
const jsyaml = require('js-yaml')

function saveTo (data, path) {
  var fdata = jsyaml.safeDump(data)
  var ws = fs.createWriteStream(path)
  ws.write(fdata)
  ws.close()
}

function loadFrom (path) {
  return new Promise((resolve, reject) => {
    try {
      var rs = fs.createReadStream(path, { encoding: 'utf8' })
      var data = ''
      rs.on('data', (chunk) => {
        data += chunk
      }).on('end', () => {
        resolve(jsyaml.safeLoad(data))
      }).on('error', (err) => {
        throw err
      })
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = {
  saveTo,
  loadFrom
}

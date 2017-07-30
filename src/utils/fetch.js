const http = require('http')
const url = require('url')
const iconv = require('iconv-lite')
const { JSDOM } = require('jsdom')

function fetchWeb (furl, encoding = 'utf8') {
  var up = url.parse(furl)
  return new Promise((resolve, reject) => {
    http.get({
      protocol: up.protocol,
      host: up.host,
      port: up.port,
      path: up.path
    }, (res) => {
      var html = ''
      res.on('data', (chunk) => {
        html += iconv.decode(chunk, encoding)
      }).on('end', () => {
        resolve(html)
      }).on('error', (e) => {
        reject(e)
      })
    })
  })
}

async function fetchDOM (furl, encoding) {
  var html = await fetchWeb(furl, encoding)
  var dom = new JSDOM(html)
  return require('jquery')(dom.window)
}

function resolveURL (furl, rooturl) {
  return furl && rooturl ? url.resolve(rooturl, furl) : ''
}

module.exports = {
  fetchDOM,
  fetchWeb,
  resolveURL
}

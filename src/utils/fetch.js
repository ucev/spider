const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')
const url = require('url')
const iconv = require('iconv-lite')
const { JSDOM } = require('jsdom')

function getFetchMethod (protocal) {
  if (protocal.startsWith('https')) {
    return https.get
  } else if (protocal.startsWith('http')) {
    return http.get
  } else {
    throw new Error(`Protocal ${protocal} is not supported`)
  }
}

function fetchUrl (furl, encoding = 'utf8') {
  return new Promise((resolve, reject) => {
    try {
      var urlparams = url.parse(furl)
      var req = getFetchMethod(urlparams.protocol)({
        protocol: urlparams.protocol,
        host: urlparams.host,
        port: urlparams.port,
        path: urlparams.path
      }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error('获取页面失败'))
        }
        var html = ''
        res.on('data', (chunk) => {
          html += iconv.decode(chunk, encoding)
        }).on('end', () => {
          resolve(html)
        }).on('error', (e) => {
          reject(e)
        })
      })
      req.on('error', (e) => {
        reject(e)
      })
    } catch (e) {
      reject(e)
    }
  })
}

async function fetchDOM (furl, encoding) {
  var html = await fetchUrl(furl, encoding)
  var dom = new JSDOM(html)
  return require('jquery')(dom.window)
}

function resolveURL (furl, rooturl) {
  if (rooturl[rooturl.length - 1] !== '/') rooturl = rooturl + '/'
  return furl && rooturl ? url.resolve(rooturl, furl) : ''
}

function downloadImg (furl, name) {
  return new Promise((resolve, reject) => {
    try {
      var exists = fs.existsSync(path.dirname(name))
      if (!exists) {
        fs.mkdirSync(path.dirname(name))
      }
      var urlparams = url.parse(furl)
      var req = http.get({
        protocal: urlparams.protocal,
        host: urlparams.host,
        path: urlparams.pathname
      }, (res) => {
        if (res.statusCode !== 200) {
          reject(name)
        }
        res.on('error', () => {
          reject(name)
        })
        var ws = fs.createWriteStream(name)
        ws.on('finish', () => {
          resolve(name)
        }).on('error', () => {
          reject(name)
        })
        res.pipe(ws, true)
      })
      req.on('socket', (socket) => {
        socket.setTimeout(5000)
        socket.on('timeout', () => {
          req.abort()
        })
      }).on('error', () => {
        reject(name)
      }).on('abort', () => {
        reject(name)
      })
    } catch (e) {
      reject(name)
    }
  })
}

module.exports = {
  fetchDOM,
  fetchUrl,
  resolveURL,
  downloadImg
}

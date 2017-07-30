const fs = require('fs')
const path = require('path')
const http = require('http')

const iconv = require('iconv-lite')
const minimist = require('minimist')
const PQueue = require('p-queue')
const url = require('url')

/**
 * 
 * @author <a href="mailto:zhangshuaiyf@icloud.com">ucev</a>
 * @version 0.0.1 (2017-7-3)
 * @fileoverview 
 *   命令行参数说明
 *      d: 目标文件夹
 *      c: 允许并行下载线程的数量
 */

function task (dest = '.', syncCnt = 10) {
  const queue = new PQueue({ concurrency: syncCnt })

  function buildTMUrl (page) {
    return `http://apps.game.qq.com/cgi-bin/ams/module/ishow/V1.0/query/workList_inc.cgi?iActId=2735&iFlowId=267733&iListNum=20&iModuleId=2735&iOrder=0&page=${page}&sDataType=JSON`
  }

  function decodeParam (name) {
    return decodeURIComponent(name)
  }

  function downloadImg (furl, name) {
    return new Promise((resolve, reject) => {
      var exists = fs.existsSync(path.dirname(name))
      if (!exists) {
        fs.mkdirSync(path.dirname(name))
      }
      var res = url.parse(furl)
      http.get({
        protocal: res.protocal,
        host: res.host,
        path: res.pathname,
        timeout: 5
      }, (res) => {
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
    })
  }

  function fetchImg (name, data) {
    var url
    for (var i = 1; i <= 8; i++) {
      ((i) => {
        url = data[`sProdImgNo_${i}`]
        url = url.slice(0, -3) + '0'
        url = decodeParam(url)
        queue.add(() => {
          var pathname = getImagePath(name, i)
          console.log(`${pathname} 正在下载`)
          return downloadImg(url, pathname).then((name) => {
            console.log(`${name} 下载完成`)
          }).catch((name) => {
            console.log(`${name} 下载失败`)
          })
        })
      })(i)
    }
  }

  function fetchUrl (url) {
    return new Promise((resolve, reject) => {
      http.get(url, (res) => {
        var html = ''
        res.on('data', (chunk) => {
          var buf = iconv.decode(chunk, 'GBK')
          html += buf.toString()
        }).on('end', () => {
          resolve(html)
        }).on('error', (err) => {
          reject(err)
        })
      })
    })
  }

  function getImagePath (name, i) {
    return path.join(dest, String(i), name + '.jpg')
  }

  function getImages (page = 0) {
    queue.add(() => {
      var url = buildTMUrl(page)
      return fetchUrl(url).then((data) => {
        var j = JSON.parse(data)
        var lists = j.List
        var totalPage = j.iTotalPages
        lists.forEach((sk) => {
          var name = decodeParam(sk.sProdName)
          fetchImg(name, sk)
        })
        if (page < totalPage) {
          getImages(page + 1)
        }
      }).catch(() => { })
    })
  }

  return () => {
    getImages()
  }
}

function parseParams () {
  return minimist(process.argv.splice(2))
}

if (require.main === module) {
  var p = parseParams()
  var param = Object.assign({ d: '.', c: 10 }, p)
  task(param.d, param.c)()
}

module.exports = task

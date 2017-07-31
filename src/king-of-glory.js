/**
 * 
 * @author <a href="mailto:zhangshuaiyf@icloud.com">ucev</a>
 * @version 0.0.1 (2017-7-3)
 * @fileoverview 
 *   命令行参数说明
 *      d: 目标文件夹
 *      c: 允许并行下载线程的数量
 *      s: 下载图片的尺寸 1-8
 */

const path = require('path')
const minimist = require('minimist')
const PQueue = require('p-queue')

const { fetchUrl, downloadImg } = require('./utils/fetch')
const logger = require('./utils/logger')
const getInt = require('./utils/getInt')

function task (dest = '.', syncCnt = 10, fetchSize = [1, 1]) {
  const queue = new PQueue({ concurrency: syncCnt })

  function buildTMUrl (page) {
    return `http://apps.game.qq.com/cgi-bin/ams/module/ishow/V1.0/query/workList_inc.cgi?iActId=2735&iFlowId=267733&iListNum=20&iModuleId=2735&iOrder=0&page=${page}&sDataType=JSON`
  }

  function decodeParam (name) {
    return decodeURIComponent(name)
  }

  function fetchImg (name, data) {
    var url
    for (var i = fetchSize[0]; i <= fetchSize[1]; i++) {
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

  function getImagePath (name, i) {
    return path.join(dest, String(i), name + '.jpg')
  }

  function getImages (page = 0) {
    queue.add(() => {
      var url = buildTMUrl(page)
      return fetchUrl(url, 'GBK').then((data) => {
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

function getFetchSize (n) {
  n = parseInt(n)
  if (n >= 1 && n <= 8) {
    return [n, n]
  } else {
    return [1, 8]
  }
}

async function __imageSize () {
  var sizes = {
    1: '缩略图',
    2: '1024x768',
    3: '1280x720',
    4: '1280x1024',
    5: '1440x900',
    6: '1920x1080',
    7: '1920x1200',
    8: '1920x1440',
    0: '全部'
  }
  var prompt = '请输入你想要下载图片的尺寸\n'
  for (var k in sizes) {
    prompt += `[${k}, ${sizes[k]}]\n`
  }
  var index = await getInt(prompt).catch(() => {
    logger.error('请输入正确的尺寸编号')
    process.exit(0)
  })
  if (index < 0 || index > 8) {
    logger.error('请输入正确的尺寸编号')
    process.exit(0)
  }
  return index
}

async function __exec () {
  var p = parseParams()
  if (!p.s) {
    p.s = await __imageSize()
  }
  p.s = getFetchSize(p.s)
  var param = Object.assign({ d: '.', c: 10 }, p)
  task(param.d, param.c, param.s)()
}

if (require.main === module) {
  __exec()
}

module.exports = task

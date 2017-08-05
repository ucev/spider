/**
 * 
 * @author <a href="mailto:zhangshuaiyf@icloud.com">ucev</a>
 * @version 0.0.1 (2017-7-30)
 * @fileoverview 
 *   功能: 拉取古诗文网上的古文
 *   命令行参数说明
 *      l: 是否仅获取古籍列表
 *      n: 如果 l 存在，获取古籍列表到文件名
 */

const { fetchDOM, resolveURL } = require('./utils/fetch')
const { saveTo } = require('./utils/data')
const minimist = require('minimist')
const logger = require('./utils/logger')
const getInt = require('./utils/getInt')

const GSW_LIST = 'http://so.gushiwen.org/guwen/'

async function _guwenlist (furl, encoding) {
  var list = []
  var $ = await fetchDOM(furl, encoding)
  $('.cont').each((i, ele) => {
    var $p = $(ele).find('p')
    var item = {}
    var a = $($p[0]).find('a')
    item.title = a.text()
    item.link = resolveURL(a.attr('href'), furl)
    item.descp = $($p[1]).text()
    if (item.title && item.link) { list.push(item) }
  })
  var $lastpage = $('.pages a').last()
  if ($lastpage.text() === '下一页') {
    var nexturl = $lastpage.attr('href')
    var nextlist = await (_guwenlist(resolveURL(nexturl, GSW_LIST)))
    list = list.concat(nextlist)
  }
  return list
}

async function guwenList (fname) {
  var list = await _guwenlist(GSW_LIST)
  if (fname) {
    saveTo(list, fname)
  }
  return list
}

function guwen (url, encoding = 'utf8') {
  return fetchDOM(url).then(($) => {
    var bookcont = $('.bookcont')
    var $childs = $(bookcont).find('span a')
    var res = []
    $childs.each((i, ele) => {
      res.push({ title: $(ele).text(), link: $(ele).attr('href') })
    })
    return res
  }).catch((e) => {
    console.log(e)
  })
}

async function fetchContent (url) {
  var $ = await fetchDOM(url)
  var contson = $('.contson')[0]
  return $(contson).text().trim()
}

function fetchGuWen (furl, fname) {
  guwen(furl).then((res) => {
    var ps = res.map((r) => fetchContent(resolveURL(r.link, furl)))
    return Promise.all(ps).then((conts) => {
      var fres = conts.map((c, i) => {
        return { title: res[i].title, content: c }
      })
      if (fname) {
        saveTo(fres, fname)
      }
    })
  }).catch((e) => {
    console.log(e)
  })
}

async function downloadGuwen () {
  // going to modify
  var list = await guwenList()
  for (var i = 0; i < list.length; i++) {
    console.log('%d  %s', i + 1, list[i].title)
  }
  var index = await getInt('请输入你想要下载的古籍序号：').catch(() => {
    logger.error('请输入正确的古籍序号')
    process.exit(0)
  })
  if (index < 0 || index > list.length) {
    logger.error('请输入正确的古籍序号')
    process.exit(0)
  }
  var furl = list[index - 1].link
  var fname = `${list[index - 1].title}.txt`
  fetchGuWen(furl, fname)
}

if (require.main === module) {
  var p = minimist(process.argv.slice(2))
  if (p.l) {
    if (!p.n) {
      logger.error('请输入文件名')
      process.exit(0)
    } else {
      guwenList(p.n)
    }
  } else {
    downloadGuwen()
  }
}

const { fetchDOM, resolveURL } = require('./utils/fetch')
const jsyaml = require('js-yaml')
const fs = require('fs')
const minimist = require('minimist')
const logger = require('./utils/logger')
const readline = require('readline')

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
    var flist = jsyaml.safeDump(list)
    var ws = fs.createWriteStream(fname)
    ws.end(flist)
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
      fres = jsyaml.safeDump(fres)
      var ws = fs.createWriteStream(fname)
      ws.write(fres)
      ws.close()
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
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  rl.question('请输入你想要下载的古籍序号：', (answer) => {
    rl.close()
    var index = parseInt(answer)
    if (isNaN(index) || index < 0 || index > list.length) {
      logger.error('请输入正确的古籍序号')
      process.exit(0)
    }
    var furl = list[index - 1].link
    var fname = `${list[index - 1].title}.txt`
    fetchGuWen(furl, fname)
  })
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
/**
 * 
 * @author <a href="mailto:zhangshuaiyf@icloud.com">ucev</a>
 * @version 0.0.1 (2017-7-3)
 * @fileoverview 
 *   功能: 拉去git仓库的commit记录
 *   命令行参数说明
 *      l: 目标库的地址
 *      d: 保存到文件名
 */

const { fetchDOM, resolveURL } = require('./utils/fetch')
const { saveTo } = require('./utils/data')
const minimist = require('minimist')
const logger = require('./utils/logger')

function extractCommitLog ($) {
  var $lists = $('.commits-list-item')
  var data = []
  $lists.each((index, litem) => {
    var dt = {}
    var $tbls = $(litem).find('.table-list-cell')
    var contributor = {}
    contributor.id = $(litem).find('.commit-author-section .commit-author').text()
    var $contributor = $($tbls[0]).find('.avatar-parent-child a')
    // 见 https://github.com/segmentio/nightmare/commits/master 上面那个没有头像的 commit log
    if ($contributor.length > 0) {
      var contributorAvatar = $contributor.find('.avatar').attr('src')
      contributor.home = resolveURL(contributor.id, 'https://github.com')
      contributor.avatar = contributorAvatar
    }
    dt.contributor = contributor
    var $title = $($tbls[1]).find('.commit-title a')
    var title = {}
    if ($title.length === 1) {
      title.type = 'commit'
      title.title = $title.text()
    } else {
      title.type = 'merge'
      title.message = $($title[0]).text()
      title.issue = $($title[1]).text()
      title.issueLink = $($title[1]).attr('href')
      title.mergeFrom = $($title[2]).text()
    }
    dt.title = title
    var time = $($tbls[1]).find('relative-time').attr('datetime')
    dt.time = time
    var $commitId = $($tbls[2]).find('.tooltipped.tooltipped-sw')
    var commitUrl = $commitId.attr('href')
    dt.commitId = commitUrl.substr(commitUrl.lastIndexOf('/') + 1)
    dt.commitUrl = commitUrl
    data.push(dt)
  })
  return data
}

function extractNextPageUrl ($) {
  var $links = $('.pagination a')
  if ($links.length === 0) {
    return false
  }
  var $older = $($links[$links.length - 1])
  if ($older.text() === 'Older') {
    return $older.attr('href')
  }
  return false
}

async function getLogs (furl) {
  var $ = await fetchDOM(furl)
  var data = extractCommitLog($)
  var nexturl = extractNextPageUrl($)
  if (nexturl) {
    console.log(nexturl)
    var nextdata = await getLogs(nexturl)
    data = data.concat(nextdata)
  }
  return data
}

async function commitLogs (furl, fname) {
  var commitUrl = resolveURL('commits/master', furl)
  var data = await getLogs(commitUrl)
  if (fname) {
    saveTo(data, fname)
  }
  return data
}

if (require.main === module) {
  var p = minimist(process.argv.slice(2))
  if (!p.l || !p.d) {
    logger.error('参数输入错误')
    process.exit(0)
  }
  commitLogs(p.l, p.d)
}

module.exports = commitLogs

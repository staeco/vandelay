import url from 'url'
import qs from 'qs'
import continueStream from 'continue-stream'
import request from 'superagent'
import through2 from 'through2'
import pumpify from 'pumpify'

const mergeURL = (origUrl, newQuery) => {
  const sourceUrl = url.parse(origUrl)
  const query = qs.stringify({
    ...qs.parse(sourceUrl.query),
    ...newQuery
  })
  return url.format({ ...sourceUrl, search: query })
}

const getQuery = (opt, page) => {
  const out = {}
  if (opt.pageParam) out[opt.pageParam] = page
  if (opt.limitParam && opt.limit) out[opt.limitParam] = opt.limit
  if (opt.offsetParam) out[opt.offsetParam] = page * opt.limit
  return out
}

const fetchURL = (url) =>
  request.get(url)
    .buffer(false)
    .redirects(10)
    .retry(10)

export default (source, opt={}) => {
  // custom stream source
  if (typeof source === 'function') return source()

  // validate params
  if (!source) throw new Error('Missing source argument')
  if (typeof source.url !== 'string') throw new Error('Invalid source url')
  if (typeof source.parser !== 'function') throw new Error('Invalid parser function')
  if (opt.modifyRequest && typeof opt.modifyRequest !== 'function') throw new Error('Invalid modifyRequest function')

  // attaches some meta to the object for the transform fn to use
  let rows = -1
  const map = function (url, row, _, cb) {
    if (!row || typeof row !== 'object') throw new Error(`Invalid row - ${row}`)
    row.___meta = {
      row: ++rows,
      url
    }

    // internal attr, json header info from the parser
    if (row.___header) {
      row.___meta = row.___header
      delete row.___header
    }
    cb(null, row)
  }

  // URL + Parser
  const fetch = (url) => {
    let req = fetchURL(url)
    if (opt.modifyRequest) req = opt.modifyRequest(source, req)
    return pumpify.obj(req, source.parser(), through2.obj(map.bind(null, url)))
  }

  if (source.pagination) {
    let page = source.pagination.startPage || 0
    let pageDatums // gets reset on each page to 0
    return continueStream.obj((cb) => {
      if (pageDatums === 0) return cb()
      pageDatums = 0
      const newURL = mergeURL(source.url, getQuery(source.pagination, page))
      page++
      cb(null, fetch(newURL))
    }).on('data', () => ++pageDatums)
  }

  return fetch(source.url)
}

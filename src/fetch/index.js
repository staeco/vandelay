import url from 'url'
import qs from 'qs'
import continueStream from 'continue-stream'
import request from 'superagent'
import through2 from 'through2'
import pumpify from 'pumpify'

const iterateStream = (sources, opt) => {
  if (sources.length === 1) return fetchStream(sources[0], opt)
  let currStream = 0
  return continueStream.obj((cb) => {
    const nextSource = sources[currStream++]
    if (!nextSource) return cb()
    cb(null, fetchStream(nextSource, opt))
  })
}

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

const fetchURL = (url) => {
  const req = request.get(url)
    .buffer(false)
    .redirects(10)
    .retry(10)
  // funky forwarding because superagent is not a real stream
  const out = through2()
  req.pipe(out)
  req.once('error', (err) => out.emit('error', err))
  return out
}

const fetchStream = (source, opt={}) => {
  if (Array.isArray(source)) return iterateStream(source, opt)
  // validate params
  if (!source) throw new Error('Missing source argument')
  if (!source.url || typeof source.url !== 'string') throw new Error('Invalid source url')
  if (typeof source.parser !== 'function') throw new Error('Invalid parser function')
  if (opt.modifyRequest && typeof opt.modifyRequest !== 'function') throw new Error('Invalid modifyRequest function')

  // URL + Parser
  const fetch = (url) => {
    // attaches some meta to the object for the transform fn to use
    let rows = -1
    const map = function (row, _, cb) {
      if (!row || typeof row !== 'object') throw new Error(`Invalid row - ${row}`)
      row.___meta = {
        row: ++rows,
        url
      }

      // internal attr, json header info from the parser
      if (row.___header) {
        row.___meta.header = row.___header
        delete row.___header
      }
      cb(null, row)
    }

    let req = fetchURL(url)
    if (opt.modifyRequest) req = opt.modifyRequest(source, req)
    return pumpify.obj(req, source.parser(), through2.obj(map))
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

export default fetchStream

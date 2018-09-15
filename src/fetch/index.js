import url from 'url'
import qs from 'qs'
import continueStream from 'continue-stream'
import through2 from 'through2'
import pumpify from 'pumpify'
import multi from './multi'
import fetchURLPlain from './fetchURL'
import parse from '../parse'

// default behavior is to fail on first error
const defaultErrorHandler = ({ error, output }) => {
  output.emit('error', error)
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

const fetchStream = (source, opt={}, raw=false) => {
  const concurrent = opt.concurrency != null ? opt.concurrency : 50
  if (Array.isArray(source)) {
    return multi({
      concurrent,
      inputs: source.map((i) => fetchStream.bind(null, i, opt, true)),
      onError: opt.onError || defaultErrorHandler
    })
  }

  const fetchURL = opt.fetchURL || fetchURLPlain

  // validate params
  if (!source) throw new Error('Missing source argument')
  const src = { ...source } // clone
  if (!src.url || typeof src.url !== 'string') throw new Error('Invalid source url')
  if (typeof src.parser === 'string') {
    if (src.parserOptions && typeof src.parserOptions !== 'object') throw new Error('Invalid source parserOptions')
    src.parser = parse(src.parser, src.parserOptions) // JSON shorthand
  }
  if (typeof src.parser !== 'function') throw new Error('Invalid parser function')
  if (opt.modifyRequest && typeof opt.modifyRequest !== 'function') throw new Error('Invalid modifyRequest function')

  // URL + Parser
  const fetch = (url) => {
    // attaches some meta to the object for the transform fn to use
    let rows = -1
    const map = function (row, _, cb) {
      // create the meta and put it on objects passing through
      if (row && typeof row === 'object') {
        row.___meta = {
          row: ++rows,
          url,
          source
        }

        // json header info from the parser
        if (row.___header) {
          row.___meta.header = row.___header
          delete row.___header
        }
      }
      cb(null, row)
    }

    let req = fetchURL(url)
    if (opt.onFetch) opt.onFetch(url)
    if (opt.modifyRequest) req = opt.modifyRequest(src, req)
    const out = pumpify.obj(req, src.parser(), through2.obj(map))
    out.abort = () => {
      req.abort()
      out.end()
    }
    out.on('error', (err) => {
      err.source = source
      err.url = url
    })
    return out
  }

  let outStream
  if (src.pagination) {
    let page = src.pagination.startPage || 0
    let pageDatums // gets reset on each page to 0
    let lastFetch
    let destroyed = false
    outStream = continueStream.obj((cb) => {
      if (destroyed || pageDatums === 0) return cb()
      pageDatums = 0
      const newURL = mergeURL(src.url, getQuery(src.pagination, page))
      lastFetch = fetch(newURL)
      page++
      cb(null, lastFetch)
    }).on('data', () => ++pageDatums)
    outStream.abort = () => {
      destroyed = true
      outStream.destroy()
      lastFetch && lastFetch.abort()
    }
  } else {
    outStream = fetch(src.url)
  }

  if (raw) return outStream // child of an array of sources, error mgmt handled already
  return multi({
    concurrent,
    inputs: [ outStream ],
    onError: opt.onError || defaultErrorHandler
  })
}

export default fetchStream

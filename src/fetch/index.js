import url from 'url'
import qs from 'qs'
import continueStream from 'continue-stream'
import through2 from 'through2'
import pumpify from 'pumpify'
import multi from './multi'
import fetchURLPlain from './fetchURL'
import parse from '../parse'
import hardClose from '../hardClose'

const getOptions = (src, opt) => ({
  log: opt.log,
  timeout: opt.timeout,
  attempts: opt.attempts,
  headers: src.headers
})

// default behavior is to fail on first error
const defaultErrorHandler = ({ error, output }) => {
  output.emit('error', error)
}

const mergeURL = (origUrl, newQuery) => {
  const sourceUrl = url.parse(origUrl)
  const query = qs.stringify({
    ...qs.parse(sourceUrl.query),
    ...newQuery
  }, { strictNullHandling: true })
  return url.format({ ...sourceUrl, search: query })
}

const getQuery = (pageOpt, page) => {
  const out = {}
  if (pageOpt.pageParam) out[pageOpt.pageParam] = page
  if (pageOpt.limitParam && pageOpt.limit) out[pageOpt.limitParam] = pageOpt.limit
  if (pageOpt.offsetParam) out[pageOpt.offsetParam] = page * pageOpt.limit
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
  if (src.headers && typeof src.headers !== 'object') throw new Error('Invalid headers object')

  // URL + Parser
  const fetch = (url, opt) => {
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

    let req = fetchURL(url, opt)
    if (opt.onFetch) opt.onFetch(url)
    const out = pumpify.ctor({
      autoDestroy: false,
      destroy: false,
      objectMode: true
    })(
      req,
      src.parser(),
      through2({ objectMode: true }, map)
    )
    out.raw = req.req
    out.abort = () => {
      req.abort()
      hardClose(out)
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
    outStream = continueStream((cb) => {
      if (destroyed || pageDatums === 0) return cb()
      pageDatums = 0
      const newURL = mergeURL(src.url, getQuery(src.pagination, page))
      lastFetch = fetch(newURL, getOptions(src, opt))
      //lastFetch.once('data', () => outStream.nextStream()) // start on the next page eagerly
      page++
      cb(null, lastFetch)
    }, { objectMode: true })
      .on('data', () => ++pageDatums)
      .pause()
    outStream.abort = () => {
      destroyed = true
      lastFetch && lastFetch.abort()
      hardClose(outStream)
    }
  } else {
    outStream = fetch(src.url, getOptions(src, opt))
  }

  if (raw) return outStream // child of an array of sources, error mgmt handled already
  return multi({
    concurrent,
    inputs: [ outStream ],
    onError: opt.onError || defaultErrorHandler
  })
}

export default fetchStream

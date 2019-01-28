import url from 'url'
import qs from 'qs'
import through2 from 'through2'
import pumpify from 'pumpify'
import template from 'url-template'
import multi from './multi'
import pageStream from './page'
import fetchURLPlain from './fetchURL'
import parse from '../parse'
import hardClose from '../hardClose'

const getOptions = (src, opt) => ({
  log: opt.log,
  timeout: opt.timeout,
  attempts: opt.attempts,
  headers: src.headers,
  context: opt.context
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
    const fullURL = opt.context && url.includes('{') ? template.parse(url).expand(opt.context) : url

    // attaches some meta to the object for the transform fn to use
    let rows = -1
    const map = function (row, _, cb) {
      // create the meta and put it on objects passing through
      if (row && typeof row === 'object') {
        row.___meta = {
          row: ++rows,
          url: fullURL,
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

    let req = fetchURL(fullURL, opt)
    if (opt.onFetch) opt.onFetch(fullURL)
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
      err.url = fullURL
    })
    return out
  }

  let outStream
  if (src.pagination) {
    const startPage = src.pagination.startPage || 0
    outStream = pageStream(startPage, (currentPage) => {
      const newURL = mergeURL(src.url, getQuery(src.pagination, currentPage))
      return fetch(newURL, getOptions(src, opt))
    }, { concurrent }).pause()
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

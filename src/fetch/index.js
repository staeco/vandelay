import pumpify from 'pumpify'
import through2 from 'through2'
import { getToken } from './oauth'
import fetch from './fetchWithParser'
import multi from './multi'
import sandbox from '../sandbox'
import mergeURL from '../mergeURL'
import pageStream from './page'
import hardClose from '../hardClose'
import parse from '../parse'

const getFetchOptions = (src, opt, pre) => ({
  fetchURL: opt.fetchURL,
  debug: opt.debug,
  timeout: opt.timeout,
  connectTimeout: opt.connectTimeout,
  attempts: opt.attempts,
  headers: src.headers,
  context: opt.context,
  ...pre
})

// default behavior is to fail on first error
const defaultErrorHandler = ({ error, output }) => {
  output.emit('error', error)
}

const getQuery = (pageOpt, page) => {
  const out = {}
  if (pageOpt.pageParam) out[pageOpt.pageParam] = page
  if (pageOpt.limitParam && pageOpt.limit) out[pageOpt.limitParam] = pageOpt.limit
  if (pageOpt.offsetParam) out[pageOpt.offsetParam] = page * pageOpt.limit
  return out
}

const fetchStream = (source, opt={}, raw=false) => {
  const concurrent = opt.concurrency != null ? opt.concurrency : 10
  if (Array.isArray(source)) {
    // zips eat memory, do not run more than one at a time
    const containsZips = source.some((i) => i.parserOptions && i.parserOptions.zip)
    if (containsZips && opt.debug) opt.debug('Detected zip, running with concurrency=1')
    return multi({
      concurrent: containsZips ? 1 : concurrent,
      inputs: source.map((i) => fetchStream.bind(null, i, opt, true)),
      onError: opt.onError || defaultErrorHandler
    })
  }

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
  if (src.oauth && typeof src.oauth !== 'object') throw new Error('Invalid oauth object')
  if (src.oauth && typeof src.oauth.grant !== 'object') throw new Error('Invalid oauth.grant object')

  // actual work time
  const runStream = (pre={}) => {
    if (src.pagination) {
      const startPage = src.pagination.startPage || 0
      return pageStream(startPage, (currentPage) => {
        const newURL = mergeURL(src.url, getQuery(src.pagination, currentPage))
        if (opt.debug) opt.debug('Fetching next page', newURL)
        return fetch({ url: newURL, parser: src.parser, source }, getFetchOptions(src, opt, pre))
      }, {
        concurrent,
        onError: defaultErrorHandler
      }).pause()
    }
    if (opt.debug) opt.debug('Fetching', src.url)
    return fetch({ url: src.url, parser: src.parser, source }, getFetchOptions(src, opt, pre))
  }

  // allow simple declarative oauth handling
  if (src.oauth) {
    src.pre = async (ourSource) => getToken(ourSource.oauth).then((accessToken) => ({ accessToken }))
  }

  let outStream
  if (src.pre) {
    if (typeof src.pre === 'string') {
      src.pre = sandbox(src.pre, opt)
    }
    const preFn = src.pre?.default || src.pre
    if (typeof preFn !== 'function') throw new Error('Invalid pre function!')

    // if oauth enabled, grab a token first and then set the pipeline
    outStream = pumpify.obj()
    preFn(src)
      .then((preResponse) => {
        const realStream = runStream(preResponse)
        outStream.abort = realStream.abort
        outStream.setPipeline(realStream, through2.obj())
      })
      .catch((err) => {
        outStream.emit('error', err)
        hardClose(outStream)
      })
  } else {
    outStream = runStream()
  }

  if (raw) return outStream // child of an array of sources, error mgmt handled already
  return multi({
    concurrent,
    inputs: [ outStream ],
    onError: opt.onError || defaultErrorHandler
  })
}

export default fetchStream

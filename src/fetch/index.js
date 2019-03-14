import url from 'url'
import qs from 'qs'
import pumpify from 'pumpify'
import through2 from 'through2'
import { getToken } from './oauth'
import fetch from './fetchWithParser'
import multi from './multi'
import pageStream from './page'
import parse from '../parse'

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
    // zips eat memory, do not run more than one at a time
    const containsZips = source.some((i) => i.parserOptions && i.parserOptions.zip)
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
  const runStream = (accessToken) => {
    if (src.pagination) {
      const startPage = src.pagination.startPage || 0
      return pageStream(startPage, (currentPage) => {
        const newURL = mergeURL(src.url, getQuery(src.pagination, currentPage))
        return fetch({ url: newURL, parser: src.parser, source, accessToken }, getOptions(src, opt))
      }, { concurrent }).pause()
    }
    return fetch({ url: src.url, parser: src.parser, source, accessToken }, getOptions(src, opt))
  }

  let outStream
  if (src.oauth) {
    // if oauth enabled, grab a token first and then set the pipeline
    outStream = pumpify.obj()
    getToken(src.oauth)
      .then((accessToken) => {
        outStream.setPipeline(runStream(accessToken), through2.obj())
      })
      .catch((err) => {
        outStream.emit('error', err)
        outStream.end()
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

import pumpify from 'pumpify'
import through2 from 'through2'
import pSeries from 'p-series'
import { pipeline } from 'readable-stream'
import duplexify from 'duplexify'
import url from 'url'
import fetchURL from './fetchURL'
import { getToken as getOAuthToken } from './oauth'
import fetchWithParser from './fetchWithParser'
import multiStream from './multiStream'
import sandbox from '../sandbox'
import mergeURL from '../mergeURL'
import pageStream from './pageStream'
import hardClose from '../hardClose'
import parse from '../parse'

const getFetchOptions = (source, opt, setupResult={}) => ({
  fetchURL: opt.fetchURL,
  debug: opt.debug,
  timeout: opt.timeout,
  connectTimeout: opt.connectTimeout,
  attempts: opt.attempts,
  context: opt.context,
  headers: {
    ...source.headers || {},
    ...setupResult.headers || {}
  },
  query: {
    ...source.query || {},
    ...setupResult.query || {}
  },
  accessToken: setupResult.accessToken
})

// default behavior is to fail on first error
const defaultErrorHandler = ({ error, output }) => {
  output.emit('error', error)
}

const getPageQuery = (pageOpt, page) => {
  const out = {}
  if (pageOpt.pageParam) out[pageOpt.pageParam] = page
  if (pageOpt.limitParam && pageOpt.limit) out[pageOpt.limitParam] = pageOpt.limit
  if (pageOpt.offsetParam) out[pageOpt.offsetParam] = page * pageOpt.limit
  return out
}

const setupContext = (source, opt, getStream) => {
  const preRun = []

  if (source.oauth) {
    preRun.push(async (ourSource) => ({
      accessToken: await getOAuthToken(ourSource.oauth)
    }))
  }

  if (source.setup) {
    if (typeof source.setup === 'string') {
      source.setup = sandbox(source.setup, opt.setup)
    }
    const setupFn = source.setup?.default || source.setup
    if (typeof setupFn !== 'function') throw new Error('Invalid setup function!')
    preRun.push(setupFn)
  }

  if (preRun.length === 0) return getStream(source) // nothing to set up, go to next step

  const preRunBound = preRun.map((fn) => fn.bind(null, source, { context: opt.context }))
  const out = pumpify.obj()
  pSeries(preRunBound)
    .then((results) => {
      const setupResult = Object.assign({}, ...results)
      const realStream = getStream(setupResult)
      out.url = realStream.url
      out.abort = realStream.abort
      out.setPipeline(realStream, through2.obj())
    })
    .catch((err) => {
      out.emit('error', err)
      hardClose(out)
    })
  return out
}

const createParser = (baseParser, nextPageParser) => {
  if (!nextPageParser) return baseParser
  return () => {
    const base = baseParser()
    const nextPage = nextPageParser()

    const read = through2()
    const write = through2.obj()
    const out = duplexify.obj(read, write)
    const fail = (err) => err && out.emit('error', err)

    // plumbing, read goes to both parsers
    // we relay data events from the base parser
    // and a nextPage event from that parser
    pipeline(read, base, fail)
    pipeline(read, nextPage, through2.obj((nextPage, _, cb) => {
      out.emit('nextPage', nextPage)
      cb()
    }), fail)
    pipeline(base, write, fail)
    return out
  }
}

const fetchStream = (source, opt={}, raw=false) => {
  const concurrent = opt.concurrency != null ? opt.concurrency : 8
  if (Array.isArray(source)) {
    // zips eat memory, do not run more than one at a time
    const containsZips = source.some((i) => i.parserOptions && i.parserOptions.zip)
    if (containsZips && opt.debug) opt.debug('Detected zip, running with concurrency=1')
    return multiStream({
      concurrent: containsZips ? 1 : concurrent,
      inputs: source.map((i) => fetchStream.bind(null, i, opt, true)),
      onError: opt.onError || defaultErrorHandler
    })
  }

  // validate params
  if (!source) throw new Error('Missing source argument')
  if (!source.url || typeof source.url !== 'string') throw new Error('Invalid source url')
  if (typeof source.parser === 'string') {
    if (source.parserOptions && typeof source.parserOptions !== 'object') throw new Error('Invalid source parserOptions')
  } else if (typeof source.parser !== 'function') {
    throw new Error('Invalid parser function')
  }
  if (source.headers && typeof source.headers !== 'object') throw new Error('Invalid headers object')
  if (source.oauth && typeof source.oauth !== 'object') throw new Error('Invalid oauth object')
  if (source.oauth && typeof source.oauth.grant !== 'object') throw new Error('Invalid oauth.grant object')

  const getStream = (setupResult) => {
    const baseParser = typeof source.parser === 'string'
      ? parse(source.parser, source.parserOptions) // JSON shorthand
      : source.parser

    if (!source.pagination) {
      return fetchWithParser({ url: source.url, parser: baseParser, source }, getFetchOptions(source, opt, setupResult))
    }

    // if nextPageSelector is present, multiplex the parsers
    if (source.pagination.nextPageSelector && typeof source.parser !== 'string') {
      throw new Error(`pagination.nextPageSelector can't be used with custom parser functions!`)
    }
    const nextPageParser = source.pagination.nextPageSelector
      ? parse(source.parser, { ...source.parserOptions, selector: source.pagination.nextPageSelector })
      : null

    const parser = createParser(baseParser, nextPageParser)

    return pageStream({
      startPage: source.pagination.startPage,
      waitForNextPage: !!nextPageParser,
      fetchNextPage: ({ nextPage, nextPageURL }) => {
        const newURL = nextPageURL
          ? url.resolve(source.url, nextPageURL)
          : mergeURL(source.url, getPageQuery(source.pagination, nextPage))
        return fetchWithParser({ url: newURL, parser, source }, getFetchOptions(source, opt, setupResult))
      },
      concurrent,
      onError: defaultErrorHandler
    })
  }

  // actual work time
  const outStream = setupContext(source, opt, getStream)
  if (raw) return outStream // child of an array of sources, error mgmt handled already
  return multiStream({
    concurrent,
    inputs: [ outStream ],
    onError: opt.onError || defaultErrorHandler
  })
}

fetchStream.fetchURL = fetchURL
fetchStream.getOAuthToken = getOAuthToken

export default fetchStream

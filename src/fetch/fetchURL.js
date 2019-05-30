import got from 'got-resume'
import through2 from 'through2'
import collect from 'get-stream'
import pump from 'pump'
import template from 'url-template'
import pickBy from 'lodash.pickby'
import httpError from './httpError'
import userAgent from './userAgent'
import hardClose from '../hardClose'

const sizeLimit = 512000 // 512kb
const oneDay = 86400000
const fiveMinutes = 300000

const retryWorthy = [
  420, 444, 408, 429, 449, 499
]
const shouldRetry = (_, original) => {
  const code = original && original.code
  const res = original && original.res

  // their server having issues, give it another go
  if (res && res.statusCode >= 500) return true

  // no point retry anything over 400 that will keep happening
  if (res && res.statusCode >= 400 && !retryWorthy.includes(res.statusCode)) return false

  // no point retrying on domains that dont exists
  if (code === 'ENOTFOUND') return false

  return true
}

export default (url, { attempts=10, headers={}, timeout, connectTimeout, accessToken, debug, context }={}) => {
  const decoded = unescape(url)
  const fullURL = context && decoded.includes('{')
    ? template.parse(decoded).expand(context)
    : url

  const out = through2()
  let isCollectingError = false

  const actualHeaders = pickBy({
    'User-Agent': userAgent,
    ...headers
  }, (v, k) => !!k && !!v)
  if (accessToken) actualHeaders.Authorization = `Bearer ${accessToken}`
  const options = {
    log: debug,
    attempts,
    shouldRetry,
    got: {
      followRedirects: true,
      timeout: {
        request: timeout || oneDay,
        connect: connectTimeout || fiveMinutes,
        socket: oneDay
      },
      headers: actualHeaders
    }
  }

  if (debug) debug('Fetching', fullURL)
  const req = got(fullURL, options)
    // handle errors
    .once('error', async (err) => {
      isCollectingError = true
      const original = err.original || err
      const { res } = original
      if (debug) debug('Got error while fetching', original)
      if (res) res.text = await collect(res, { maxBuffer: sizeLimit })
      out.emit('error', httpError(original, res))
      out.abort()
    })
    .once('response', () => {
      if (isCollectingError) return
      if (debug) debug('Got a response')
      pump(req, out)
    })

  out.abort = () => {
    if (debug) debug('Abort called')
    hardClose(out)
    req.cancel()
  }
  out.req = req
  out.url = fullURL
  return out
}

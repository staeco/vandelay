import got from 'got-resume'
import through2 from 'through2'
import collect from 'get-stream'
import pump from 'pump'
import template from 'url-template'
import httpError from './httpError'
import userAgent from './userAgent'
import hardClose from '../hardClose'

const sizeLimit = 512000 // 512kb
const oneDay = 86400000

const shouldRetry = (_, original) => {
  const code = original && original.code
  const res = original && original.res

  // their server having issues, give it another go
  if (res && res.statusCode >= 500) return true

  // no point retry anything over 400
  if (res && res.statusCode >= 400) return false

  // no point retrying on domains that dont exists
  if (code === 'ENOTFOUND') return false

  return true
}

export default (url, { attempts=10, headers={}, timeout, accessToken, log, context }={}) => {
  const decoded = unescape(url)
  const fullURL = context && decoded.includes('{')
    ? template.parse(decoded).expand(context)
    : url

  const out = through2()
  let isCollectingError = false

  const actualHeaders = {
    'User-Agent': userAgent,
    ...headers
  }
  if (accessToken) actualHeaders.Authorization = `Bearer ${accessToken}`
  const options = {
    log,
    attempts,
    shouldRetry,
    got: {
      followRedirects: true,
      timeout: {
        request: timeout || oneDay,
        connect: oneDay,
        socket: oneDay
      },
      headers: actualHeaders
    }
  }

  const req = got(fullURL, options)
    // handle errors
    .once('error', async (err) => {
      isCollectingError = true
      const original = err.original || err
      const { res } = original
      if (res) res.text = await collect(res, { maxBuffer: sizeLimit })
      out.emit('error', httpError(original, res))
      out.abort()
    })
    .once('response', () => {
      if (isCollectingError) return
      pump(req, out)
    })

  out.abort = () => {
    hardClose(out)
    req.cancel()
  }
  out.req = req
  out.url = fullURL
  return out
}

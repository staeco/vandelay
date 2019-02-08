import got from 'got-resume'
import through2 from 'through2'
import collect from 'get-stream'
import pump from 'pump'
import template from 'url-template'
import hardClose from '../hardClose'

const defaultUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.80 Safari/537.36'

const sizeLimit = 512000 // 512kb
const rewriteError = (err) => {
  if (err.statusCode) return new Error(`Server responded with "${err.statusMessage}"`)
  if (err.code === 'ENOTFOUND') return new Error('Failed to resolve server host')
  if (err.code === 'ECONNRESET') return new Error('Connection to server was lost')
  if (typeof err.code === 'string' && err.code.includes('TIMEDOUT')) return new Error('Server took too long to respond')
  return new Error('Failed to connect to server')
}
const httpError = (err, res) => {
  const nerror = rewriteError(err)
  nerror.requestError = true
  nerror.code = err.code
  nerror.status = res && res.statusCode
  nerror.headers = res && res.headers
  nerror.body = res && res.text
  return nerror
}
const oneDay = 86400000

export default (url, { attempts=10, headers={}, timeout, log, context }={}) => {
  const decoded = unescape(url)
  const fullURL = context && decoded.includes('{')
    ? template.parse(decoded).expand(context)
    : url

  const out = through2()
  let isCollectingError = false

  const options = {
    log,
    attempts,
    got: {
      followRedirects: true,
      timeout: {
        request: timeout || oneDay,
        connect: oneDay,
        socket: oneDay
      },
      headers: {
        'user-agent': defaultUserAgent,
        ...headers
      }
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

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
        'user-agent': userAgent,
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

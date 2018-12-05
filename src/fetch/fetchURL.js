import got from 'got-resume'
import through2 from 'through2'
import collect from 'get-stream'
import pump from 'pump'
import hardClose from '../hardClose'

const sizeLimit = 512000 // 512kb
const rewriteError = (err) => {
  if (err.statusCode) return new Error(`Server responded with "${err.statusMessage}"`)
  if (err.code === 'ENOTFOUND') return new Error('Failed to resolve server host')
  if (err.code === 'ECONNRESET') return new Error('Connection to server was lost')
  if (err.timeout) return new Error('Server took too long to respond')
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

export default (url, { attempts=10, headers, timeout }={}) => {
  const out = through2()
  let isCollectingError = false

  const options = {
    attempts,
    got: {
      followRedirects: true,
      timeout,
      headers
    }
  }

  const req = got(url, options)
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
  return out
}

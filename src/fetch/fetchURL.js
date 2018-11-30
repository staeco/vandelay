import got from 'got'
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
export default (url, { headers, timeout }={}) => {
  const out = through2()
  let isCollectingError = false

  const gotOptions = {
    buffer: false,
    followRedirects: true,
    attempts: 10,
    ...timeout && { timeout: timeout },
    ...headers && { headers: headers }
  }

  const req = got.stream(url, gotOptions)
    // handle errors
    .once('error', async (err, _, res) => {
      isCollectingError = true
      if (res) res.text = await collect(res, { maxBuffer: sizeLimit })
      out.emit('error', httpError(err, res))
      hardClose(out)
    })
    .once('response', (res) => {
      if (isCollectingError) return
      pump(res, out)
    })

  out.abort = () => {
    hardClose(out)
    req._destroy() // calls abort on the inner emitter in `got`
  }
  return out
}

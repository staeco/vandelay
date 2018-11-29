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
  nerror.code = res.code
  nerror.status = res.statusCode
  nerror.headers = res.headers
  if(res.statusCode) nerror.body = `${res.statusCode}`
  return nerror
}
export default (url, { headers, timeout }={}) => {
  let haltEnd = false
  const out = through2()
  const errCollector = through2()

  let gotOptions = {
    stream: true,
    buffer: false,
    followRedirects: true,
    retry: 10
  }
  if (timeout) gotOptions.timeout = timeout
  if (headers) gotOptions.headers = headers

  let req = got(url, gotOptions)
  req
    // http errors
    .once('response', async (res) => {
      if (!res.error) return
      haltEnd = true
      res.text = await collect(errCollector, { maxBuffer: sizeLimit })
      out.emit('error', httpError(res.error, res))
      hardClose(out)
    })
    // network errors
    .once('error', (err) => {
      out.emit('error', httpError(err, err))
      hardClose(out)
    })

  const inp = pump(req, errCollector, () => {
    if (!haltEnd) hardClose(out)
  })
  out.abort = () => {
    hardClose(out)
    req.end()
  }
  return inp.pipe(out, { end: false })
}

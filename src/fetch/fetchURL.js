import request from 'superagent'
import through2 from 'through2'

const rewriteError = (err) => {
  if (err.status) return new Error(`HTTP Error ${err.status} received!`)
  if (err.code === 'ENOTFOUND') return new Error('Failed to resolve host!')
  if (err.code === 'ECONNRESET') return new Error('Connection to host was lost!')
  return new Error('Failed to connect to host!')
}
const httpError = (err, res) => {
  const nerror = rewriteError(err)
  nerror.requestError = true
  nerror.body = res.text
  nerror.code = res.code
  nerror.status = res.status
  return nerror
}
export default (url) => {
  const out = through2()
  const req = request.get(url)
    .buffer(false)
    .redirects(10)
    .retry(10)
    .once('response', (res) => {
      if (res.error) {
        out.emit('error', httpError(res.error, res))
      }
    })
    .once('error', (err) => {
      out.emit('error', httpError(err, err.res || err))
    })
  return req.pipe(out)
}

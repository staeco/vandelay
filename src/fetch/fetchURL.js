import request from 'superagent'
import through2 from 'through2'

const rewriteError = (err) => {
  if (err.status) return new Error(`HTTP Error ${err.status} received!`)
  if (err.code === 'ENOTFOUND') return new Error('Failed to resolve host!')
  if (err.code === 'ECONNRESET') return new Error('Connection to host was lost!')
  return new Error('Failed to connect to host!')
}
export default (url) => {
  const out = through2()
  const req = request.get(url)
    .buffer(false)
    .redirects(10)
    .retry(10)
    .once('response', (res) => {
      if (res.error) {
        const nerror = rewriteError(res.error)
        nerror.code = res.code
        nerror.status = res.status
        out.emit('error', nerror)
      }
    })
    .once('error', (err) => {
      const nerror = rewriteError(err)
      nerror.code = err.code
      nerror.status = err.status
      out.emit('error', nerror)
    })
  return req.pipe(out)
}

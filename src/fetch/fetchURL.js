import request from 'superagent'
import through2 from 'through2'

export default (url) => {
  const out = through2()
  const req = request.get(url)
    .buffer(false)
    .redirects(10)
    .retry(5)
    .once('response', (res) => {
      if (res.error) out.emit('error', res.error)
    })
    .once('error', (err) => out.emit('error', err))
  return req.pipe(out)
}

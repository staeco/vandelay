import request from 'superagent'
import through2 from 'through2'
import retry from 'superagent-retry-delay'

retry(request) // hook it

export default (url) => {
  const out = through2()
  const req = request.get(url)
    .buffer(false)
    .redirects(10)
    .retry(10, 5000, [ 401, 404 ])
    .once('response', (res) => {
      if (res.error) out.emit('error', res.error)
    })
    .once('error', (err) => out.emit('error', err))
  return req.pipe(out)
}

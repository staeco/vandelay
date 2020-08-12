import through from 'through2'
import { clone } from 'lodash'

export default (fn, opt={}) => {
  if (typeof fn !== 'function') throw new Error('Invalid function!')
  const maxConcurrency = opt.concurrency != null ? opt.concurrency : 8

  const tap = (row, _, cb) => {
    let meta
    // pluck the ___meta attr we attached in fetch
    if (row && typeof row === 'object') {
      meta = row.___meta
      delete row.___meta
    }
    fn(row, meta)
      .then((res) => {
        if (res == null) return cb()
        if (meta) {
          res = clone(res)
          res.___meta = meta
        }
        cb(null, res)
      })
      .catch(cb)
  }
  return through({
    objectMode: true,
    highWaterMark: Math.min(16, maxConcurrency * 2)
  }, tap)
}

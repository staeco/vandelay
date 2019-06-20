import through from 'through2-concurrent'
import clone from 'lodash.clone'

export default (fn, opt={}) => {
  if (typeof fn !== 'function') throw new Error('Invalid function!')
  const maxConcurrency = opt.concurrency != null ? opt.concurrency : 10

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
  return through.obj({
    maxConcurrency,
    highWaterMark: Math.max(maxConcurrency * 2, 32)
  }, tap)
}

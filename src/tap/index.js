import { transform } from 'bluestream'
import { clone } from 'lodash'

export default (fn, opt={}) => {
  if (typeof fn !== 'function') throw new Error('Invalid function!')
  const maxConcurrency = opt.concurrency != null ? opt.concurrency : 8

  const tap = async (row) => {
    let meta
    // pluck the ___meta attr we attached in fetch
    if (row && typeof row === 'object') {
      meta = row.___meta
      delete row.___meta
    }
    let res = await fn(row, meta)
    if (res == null) return
    if (meta) {
      res = clone(res)
      res.___meta = meta
    }
    return res
  }
  return transform({
    concurrent: maxConcurrency,
    highWaterMark: Math.max(16, maxConcurrency * 2)
  }, tap)
}

import { transform } from 'bluestream'
import clone from 'lodash.clone'

export default (fn, opt={}) => {
  if (typeof fn !== 'function') throw new Error('Invalid function!')
  const concurrent = opt.concurrency != null ? opt.concurrency : 50

  const tap = async (row) => {
    let meta
    // pluck the ___meta attr we attached in fetch
    if (row && typeof row === 'object') {
      meta = row.___meta
      delete row.___meta
    }
    row = await fn(row, meta)
    if (row == null) return
    if (meta) {
      row = clone(row)
      row.___meta = meta
    }
    return row
  }
  return transform({
    concurrent,
    highWaterMark: concurrent
  }, tap)
}

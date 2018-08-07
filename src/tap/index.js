import { transform } from 'bluestream'

export default (fn, opt={}) => {
  if (typeof fn !== 'function') throw new Error('Invalid function!')

  const tap = async (row) => {
    let meta
    // pluck the _meta attr we attached in fetch
    if (typeof row === 'object') {
      meta = row.___meta
      delete row.___meta
    }
    row = await fn(row, meta)
    if (row == null) return
    if (meta) row = { ...row, ___meta: meta } // tack meta back on
    return row
  }
  return transform({
    concurrent: opt.concurrency != null ? opt.concurrency : 50
  }, tap)
}

import { transform } from 'bluestream'

export default (fn, opt={}) => {
  if (typeof fn !== 'function') throw new Error('Invalid function!')

  const tap = async (record) => {
    // pluck the _meta attr we attached in fetch
    const meta = record.___meta
    delete record.___meta
    record = await fn(record, meta)
    if (!record) return
    if (meta) record.___meta = meta // tack meta back on
    return record
  }
  return transform({
    concurrent: opt.concurrency != null ? opt.concurrency : 50
  }, tap)
}

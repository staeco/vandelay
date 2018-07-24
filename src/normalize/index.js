import { transform } from 'bluestream'

export default (opt={}) => {
  const normalize = async (row) => {
    // strip internal crap back off
    if (typeof row === 'object') delete row.___meta
    return row
  }
  return transform({
    concurrent: opt.concurrency != null ? opt.concurrency : 50
  }, normalize)
}

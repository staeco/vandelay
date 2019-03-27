import through from 'through2-concurrent'

export default (opt={}) => {
  const maxConcurrency = opt.concurrency != null ? opt.concurrency : 10
  const normalize = (row, _, cb) => {
    // strip internal crap back off
    if (row && typeof row === 'object') delete row.___meta
    cb(null, row)
  }
  return through.obj({
    maxConcurrency,
    highWaterMark: Math.max(maxConcurrency * 2, 32)
  }, normalize)
}

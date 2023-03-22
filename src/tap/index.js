import { clone } from 'lodash'
import mapStream from '../streams/mapStream'

const defaultConcurrency = 8

export default (fn, opt = {}) => {
  if (typeof fn !== 'function') throw new Error('Invalid function!')
  const concurrency = opt.concurrency != null ? opt.concurrency : defaultConcurrency

  const tap = (row, cb) => {
    // use nextTick so we don't block the main loop
    process.nextTick(() => {
      let meta
      // pluck the ___meta attr we attached in fetch
      if (row?.___meta) {
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
    })
  }
  return mapStream.obj(tap, { concurrency })
}

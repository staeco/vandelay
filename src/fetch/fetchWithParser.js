import { pipeline } from 'stream'
import { pickBy } from 'lodash'
import mapStream from '../streams/mapStream'
import fetchURLPlain from './fetchURL'
import hardClose from '../hardClose'

const notNull = (v) => v != null
export default ({ url, parser, source }, opt) => {
  const fetchURL = opt.fetchURL || fetchURLPlain

  // attaches some meta to the object for the transform fn to use
  let rows = -1
  const req = fetchURL(url, opt)
  if (opt.onFetch) opt.onFetch(req.url)
  const map = (row, cb) => {
    // create the meta and put it on objects passing through
    if (row && typeof row === 'object') {
      row.___meta = pickBy({
        row: ++rows,
        url: req.url,
        accessToken: opt?.accessToken,
        context: opt?.context,
        source
      }, notNull)

      // json header info from the parser
      if (row.___header) {
        row.___meta.header = row.___header
        delete row.___header
      }
    }
    cb(null, row)
  }

  const parse = parser()
  const out = pipeline(
    req,
    parse,
    mapStream.obj(map),
    (err) => {
      if (err) out.emit('error', err)
    }
  )

  // forward some props and events
  parse.once('nextPage', (...a) => out.emit('nextPage', ...a))
  out.req = req.req
  out.url = req.url
  out.abort = () => {
    req.abort()
    hardClose(out)
  }
  out.on('error', (err) => {
    err.source = source
    err.url = req.url
  })
  return out
}

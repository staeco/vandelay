import { parseString } from 'xml2js'
import mapStream from '../streams/mapStream'

export default (opt) => {
  const xmlOpt = {
    strict: opt.strict || true,
    explicitArray: false
  }
  const xml2JsonStream = mapStream.obj((row, cb) => {
    const str = row.toString()
    parseString(str, xmlOpt, (err, js) => {
      cb(err, JSON.stringify(js))
    })
  })
  return xml2JsonStream
}

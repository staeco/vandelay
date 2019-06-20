import { parseString } from 'xml2js'
import through2 from 'through2'

export default (opt) => {
  const xmlOpt = {
    strict: opt.strict || true,
    explicitArray: false
  }
  const xml2JsonStream = through2.obj((row, _, cb) => {
    const str = row.toString()
    parseString(str, xmlOpt, (err, js) => {
      cb(err, JSON.stringify(js))
    })
  })
  return xml2JsonStream
}

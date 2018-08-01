import { Parser } from 'xml2js-parser'
import through2 from 'through2'
import camelcase from 'camelcase'
import autoParse from './autoParse'

export default (opt) => {
  const valueProcessors = opt.autoParse ? [ autoParse ] : null
  const nameProcessors = opt.camelcase ? [ camelcase ] : null
  const xmlParser = new Parser({
    explicitArray: false,
    valueProcessors,
    attrValueProcessors: valueProcessors,
    tagNameProcessors: nameProcessors,
    attrNameProcessors: nameProcessors
  })
  const xml2JsonStream = through2.obj((row, _, cb) => {
    xmlParser.parseString(row.toString(), (err, js) => {
      cb(err, JSON.stringify(js))
    })
  })
  return xml2JsonStream
}

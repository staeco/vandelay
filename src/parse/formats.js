import { Parser } from 'xml2js-parser'
import csvStream from 'csv-parser'
import excelStream from 'exceljs-transform-stream'
import through2 from 'through2'
import shpToJSON from 'shp2json'
import duplex from 'duplexify'
import pumpify from 'pumpify'
import pump from 'pump'
import JSONStream from 'JSONStream'
import camelcase from 'camelcase'
import autoParse from './autoParse'

// these formatters receive one argument, "data source" object
// and return a stream that maps strings to items
export const csv = (opt) => {
  if (opt.camelcase && typeof opt.camelcase !== 'boolean') throw new Error('Invalid camelcase option')
  if (opt.autoParse && typeof opt.autoParse !== 'boolean') throw new Error('Invalid autoParse option')

  const head = csvStream({
    mapHeaders: (v) => opt.camelcase ? camelcase(v) : v.trim(),
    mapValues: (v) => opt.autoParse ? autoParse(v) : v
  })
  // convert into normal objects
  const tail = through2.obj((row, _, cb) => {
    delete row.headers
    cb(null, { ...row })
  })
  return pumpify.obj(head, tail)
}
export const excel = (opt) => {
  if (opt.camelcase && typeof opt.camelcase !== 'boolean') throw new Error('Invalid camelcase option')
  if (opt.autoParse && typeof opt.autoParse !== 'boolean') throw new Error('Invalid autoParse option')
  return excelStream({
    mapHeaders: (v) => opt.camelcase ? camelcase(v) : v.trim(),
    mapValues: (v) => opt.autoParse ? autoParse(v) : v
  })
}
export const json = (opt) => {
  if (typeof opt.selector !== 'string') throw new Error('Missing selector for JSON parser!')
  if (!opt.selector.includes('*')) throw new Error('Selector must contain a * somewhere!')

  const head = JSONStream.parse(opt.selector)
  let header
  head.on('header', (data) => header = data)
  const tail = through2.obj((row, _, cb) => {
    if (header && typeof row === 'object') row.___header = header // internal attr, json header info for fetch stream
    cb(null, row)
  })
  return pumpify.obj(head, tail)
}

export const xml = (opt) => {
  if (opt.camelcase && typeof opt.camelcase !== 'boolean') throw new Error('Invalid camelcase option')
  if (opt.autoParse && typeof opt.autoParse !== 'boolean') throw new Error('Invalid autoParse option')
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
  return pumpify.obj(xml2JsonStream, json(opt))
}

export const shp = () => {
  const head = through2()
  const mid = shpToJSON(head)
  const tail = JSONStream.parse('features.*')
  return duplex.obj(head, pump(mid, tail))
}

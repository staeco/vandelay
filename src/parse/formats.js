import csvStream from 'csv-parser'
import excelStream from 'exceljs-transform-stream'
import through2 from 'through2'
import shpToJSON from 'shp2json'
import duplex from 'duplexer2'
import pumpify from 'pumpify'
import pump from 'pump'
import JSONStream from 'JSONStream'
import parseGTFS from 'gtfs-stream'
import camelcase from 'camelcase'
import unzip from './unzip'
import xml2json from './xml2json'
import autoParse from './autoParse'

// these formatters receive one argument, "data source" object
// and return a stream that maps strings to items
export const csv = (opt) => {
  if (opt.camelcase && typeof opt.camelcase !== 'boolean') throw new Error('Invalid camelcase option')
  if (opt.autoParse && typeof opt.autoParse !== 'boolean') throw new Error('Invalid autoParse option')
  if (opt.zip) return unzip(csv.bind(this, { ...opt, zip: undefined }), /\.csv$/)

  const head = csvStream({
    mapHeaders: ({ header }) => opt.camelcase ? camelcase(header) : header.trim(),
    mapValues: ({ value }) => opt.autoParse ? autoParse(value) : value
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
  if (opt.zip) return unzip(excel.bind(this, { ...opt, zip: undefined }), /\.xlsx$/)
  return excelStream({
    mapHeaders: (v) => opt.camelcase ? camelcase(v) : v.trim(),
    mapValues: (v) => opt.autoParse ? autoParse(v) : v
  })
}
export const json = (opt) => {
  if (Array.isArray(opt.selector)) {
    const inStream = through2()
    const outStream = through2.obj()
    opt.selector.forEach((selector) =>
      pump(inStream, json({ ...opt, selector }), outStream)
    )
    return duplex({ objectMode: true }, inStream, outStream)
  }

  if (typeof opt.selector !== 'string') throw new Error('Missing selector for JSON parser!')
  if (opt.zip) return unzip(json.bind(this, { ...opt, zip: undefined }), /\.json$/)
  const head = JSONStream.parse(opt.selector)
  let header
  head.once('header', (data) => header = data)
  const tail = through2.obj((row, _, cb) => {
    if (header && typeof row === 'object') row.___header = header // internal attr, json header info for fetch stream
    cb(null, row)
  })
  return pumpify.obj(head, tail)
}

export const xml = (opt) => {
  if (opt.camelcase && typeof opt.camelcase !== 'boolean') throw new Error('Invalid camelcase option')
  if (opt.autoParse && typeof opt.autoParse !== 'boolean') throw new Error('Invalid autoParse option')
  if (opt.zip) return unzip(xml.bind(this, { ...opt, zip: undefined }), /\.xml$/)
  return pumpify.obj(xml2json(opt), json(opt))
}

export const html = (opt) => {
  if (opt.camelcase && typeof opt.camelcase !== 'boolean') throw new Error('Invalid camelcase option')
  if (opt.autoParse && typeof opt.autoParse !== 'boolean') throw new Error('Invalid autoParse option')
  if (opt.zip) return unzip(html.bind(this, { ...opt, zip: undefined }), /\.xml$/)
  return pumpify.obj(xml2json({ ...opt, strict: false }), json(opt))
}

export const shp = () => {
  const head = through2()
  const mid = shpToJSON(head)
  const tail = JSONStream.parse('features.*')
  return duplex({ objectMode: true }, head, pump(mid, tail))
}

export const gtfsrt = () => parseGTFS.rt()
export const gtfs = () => parseGTFS()

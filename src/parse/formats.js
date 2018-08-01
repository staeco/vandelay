import csvStream from 'csv-parser'
import excelStream from 'exceljs-transform-stream'
import through2 from 'through2'
import shpToJSON from 'shp2json'
import duplex from 'duplexify'
import pumpify from 'pumpify'
import pump from 'pump'
import JSONStream from 'JSONStream'
import camelcase from 'camelcase'
import xml2json from './xml2json'
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
  return pumpify.obj(xml2json(opt), json(opt))
}

export const shp = () => {
  const head = through2()
  const mid = shpToJSON(head)
  const tail = JSONStream.parse('features.*')
  return duplex.obj(head, pump(mid, tail))
}

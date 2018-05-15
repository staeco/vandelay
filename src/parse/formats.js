import { Parser } from 'xml2js-parser'
import parse from 'csv-parser'
import excelStream from 'exceljs-transform-stream'
import through2 from 'through2'
import shpToJSON from 'shp2json'
import duplex from 'duplexify'
import pumpify from 'pumpify'
import pump from 'pump'
import JSONStream from 'JSONStream'
import camelize from 'camelize'
import autoParse from './autoParse'

// these formatters receive one argument, "data source" object
// and return a stream that maps strings to items
export const csv = (opt) =>
  parse({
    mapHeaders: (v) => opt.camelize ? camelize(v) : v.trim(),
    mapValues: (v) => opt.autoParse ? autoParse(v) : v
  })

export const excel = (opt) =>
  excelStream({
    mapHeaders: (v) => opt.autoParse ? camelize(v) : v.trim(),
    mapValues: (v) => opt.autoParse ? autoParse(v) : v
  })

export const json = (opt) => {
  if (!opt.selector) throw new Error('Missing selector for JSON parser!')
  const head = JSONStream.parse(opt.selector)
  let header
  head.on('header', (data) => header = data)
  const tail = through2.obj((row, _, cb) => {
    if (header) row.___header = header // internal attr, json header info for fetch stream
    cb(null, row)
  })
  return pumpify.obj(head, tail)
}

export const xml = (opt) => {
  const xmlParser = new Parser({ explicitArray: false })
  const xml2JsonStream = through2.obj((row, _, cb) => {
    const xml = row.toString()
    const js = xmlParser.parseStringSync(xml)
    const json = JSON.stringify(js)
    cb(null, json)
  })
  return pumpify.obj(xml2JsonStream, json(opt))
}

export const shp = () => {
  const head = through2()
  const mid = shpToJSON(head)
  const tail = JSONStream.parse('features.*')
  return duplex.obj(head, pump(mid, tail))
}

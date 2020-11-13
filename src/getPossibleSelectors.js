import pumpify from 'pumpify'
import paths from 'jsonstream-paths'
import isObject from 'is-plain-obj'
import { getSelectors as getExcelSelectors } from 'exceljs-transform-stream'
import xml2json from './parse/xml2json'

// only return paths where there are objects
const jsonSelectorFilter = (path, value, isIterable) => {
  if (!isIterable) return false
  if (path === '*' && value == null && !isIterable) return false
  if (value == null) return true // null = some asterisk returned an object
  if (Array.isArray(value)) return value.every(isObject)
  return true
}
const jsonParser = () => paths({ filter: jsonSelectorFilter })
const selectorParsers = {
  json: jsonParser,
  xml: jsonParser,
  html: jsonParser,
  excel: getExcelSelectors
}
const serializers = {
  xml: xml2json,
  html: (opt = {}) => xml2json({ ...opt, strict: false })
}

export const formats = Object.keys(selectorParsers)
export default (parser, parserOptions) => {
  if (!selectorParsers[parser]) throw new Error('Invalid parser - does not support selectors')
  const parse = selectorParsers[parser](parserOptions)
  if (!serializers[parser]) return parse

  return pumpify.obj(
    serializers[parser](parserOptions),
    parse
  )
}

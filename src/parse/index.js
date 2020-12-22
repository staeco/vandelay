import pumpify from 'pumpify'
import { omit } from 'lodash'
import isObject from 'is-plain-obj'
import bom from 'remove-bom-stream'
import mapStream from '../streams/mapStream'
import * as formats from './formats'
import * as autoFormat from '../autoFormat'

export default (format, opt = {}) => {
  if (typeof format !== 'string') throw new Error('Invalid format argument')
  const fmt = formats[format]
  if (!fmt) throw new Error(`${format} is not a supported parser format`)
  if (opt.autoFormat && !autoFormat[opt.autoFormat]) throw new Error('Invalid autoFormat option')
  fmt(opt) // just to validate!
  if (!opt.autoFormat) return () => fmt(opt)
  return () => {
    const head = fmt(opt)
    const tail = mapStream.obj((row, cb) => {
      // fun dance to retain the json header field needed for our metadata
      const nrow = isObject(row)
        ? omit(row, '___header')
        : row
      const out = autoFormat[opt.autoFormat](nrow)
      if (row.___header) out.___header = row.___header
      cb(null, out)
    })
    return pumpify.obj(bom(), head, tail)
  }
}

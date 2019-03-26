import through2 from 'through2'
import pumpify from 'pumpify'
import omit from 'lodash.omit'
import isObject from 'is-plain-object'
import bom from 'remove-bom-stream'
import * as formats from './formats'
import * as autoFormat from '../autoFormat'

export default (format, opt={}) => {
  if (typeof format !== 'string') throw new Error('Invalid format argument')
  const fmt = formats[format]
  if (!fmt) throw new Error(`${format} is not a support parser format`)
  if (opt.autoFormat && !autoFormat[opt.autoFormat]) throw new Error('Invalid autoFormat option')
  fmt(opt) // create a test one to validate the options
  if (!opt.autoFormat) return () => fmt(opt)
  return () => {
    const head = fmt(opt)
    const tail = through2.obj((row, _, cb) => {
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

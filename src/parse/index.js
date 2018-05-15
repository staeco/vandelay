import * as formats from './formats'

export default (format, opt={}) => {
  if (typeof format !== 'string') throw new Error('Invalid format argument')
  const fmt = formats[format]
  if (!fmt) throw new Error(`${format} is not a support parser format`)
  return () => fmt(opt)
}

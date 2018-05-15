import sandbox from './sandbox'
import tap from '../tap'

export default (transformer, opt={}) => {
  if (typeof transformer === 'string') transformer = sandbox(transformer, opt.sandbox)
  const transformFn = transformer.default || transformer
  if (typeof transformFn !== 'function') throw 'Invalid transform function!'

  const transform = async (record, meta) => {
    if (opt.onBegin) opt.onBegin(record, meta)

    // transform it
    let transformed
    try {
      transformed = await transformFn(record, meta)
    } catch (err) {
      if (opt.onError) opt.onError(err, record, meta)
      return
    }
    if (!transformed) {
      if (opt.onSkip) opt.onSkip(record, meta)
      return
    }
    if (opt.onSuccess) opt.onSuccess(record, meta)
    return transformed
  }
  return tap(transform, opt)
}

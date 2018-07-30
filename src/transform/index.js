import { transform as transformObject } from 'object-transform-stack'
import sandbox from './sandbox'
import tap from '../tap'

export default (transformer, opt={}) => {
  if (Array.isArray(transformer)) {
    const stack = transformer
    transformer = (v) => transformObject(stack, v, opt)
  }
  if (typeof transformer === 'string') transformer = sandbox(transformer, opt)
  const transformFn = transformer.default || transformer
  if (typeof transformFn !== 'function') throw new Error('Invalid transform function!')

  const transform = async (record, meta) => {
    if (opt.onBegin) opt.onBegin(record, meta)

    // filter
    if (typeof opt.filter === 'function') {
      let filter
      try {
        filter = await opt.filter(record, meta)
      } catch (err) {
        if (opt.onError) opt.onError(err, record, meta)
        return
      }
      if (filter != true) {
        if (opt.onSkip) opt.onSkip(record, meta)
        return
      }
    }

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
    if (opt.onSuccess) opt.onSuccess(transformed, record, meta)
    return transformed
  }
  return tap(transform, opt)
}

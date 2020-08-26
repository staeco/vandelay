import { spawn, Pool, Worker } from 'threads'
import { finished } from 'readable-stream'
import isObject from 'is-plain-obj'
import { transform as transformObject } from 'object-transform-stack'
import memo from 'moize'
import { getDefaultFunction } from '../sandbox'
import tap from '../tap'

// transformer can either be an object, a string, or a function
const getTransformFunction = memo.deep((transformer, opt={}) => {
  // object transform - run it as object-transform-stack in thread
  if (isObject(transformer)) {
    const stack = transformer
    return (v) => transformObject(stack, v, opt)
  }

  // custom code importer with pooling enabled - run it in the worker pool
  if (typeof transformer === 'string' && opt.pooling === true) {
    const pool = Pool(() => spawn(new Worker('./worker')), opt.concurrency || 8)
    const transformFn = async (record, meta) =>
      pool.queue(async (work) =>
        work(transformer, {
          timeout: opt.timeout
        }, record, meta)
      )
    transformFn().catch(() => null) // warm up the pool
    transformFn.pool = pool
    return transformFn
  }

  // custom code importer with pooling disabled - run it in our thread
  if (typeof transformer === 'string') {
    return getDefaultFunction(transformer, opt)
  }

  // already was a function - basically do nothing here
  if (typeof transformer !== 'function') throw new Error('Invalid transform function!')
  return transformer
})

export default (transformer, opt={}) => {
  const transformFn = getTransformFunction(transformer, opt)
  const transform = async (record, meta) => {
    if (opt.onBegin) await opt.onBegin(record, meta)

    // filter
    if (typeof opt.filter === 'function') {
      let filter
      try {
        filter = await opt.filter(record, meta)
      } catch (err) {
        if (opt.onError) await opt.onError(err, record, meta)
        return
      }
      if (filter != true) {
        if (opt.onSkip) await opt.onSkip(record, meta)
        return
      }
    }

    // transform it
    let transformed
    try {
      transformed = await transformFn(record, meta)
    } catch (err) {
      if (opt.onError) await opt.onError(err, record, meta)
      return
    }
    if (!transformed) {
      if (opt.onSkip) await opt.onSkip(record, meta)
      return
    }
    if (opt.onSuccess) await opt.onSuccess(transformed, record, meta)
    return transformed
  }
  const outStream = tap(transform, opt)
  if (transformFn.pool) {
    finished(outStream, () => {
      transformFn.pool.terminate()
    })
  }
  return outStream
}

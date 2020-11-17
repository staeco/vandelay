import { expose } from 'threads/worker'
import memo from 'moize'
import { getDefaultFunction } from '../sandbox'

const memoized = memo.deep(getDefaultFunction)

expose(async (transformer, opt = {}, record, meta) => {
  if (typeof record === 'undefined') return // this was a warm-up call
  const fn = memoized(transformer, opt)
  return fn(record, meta)
})

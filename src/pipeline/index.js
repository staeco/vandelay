/* eslint-disable no-loops/no-loops */
import { pipeline } from 'stream'
import ex from 'stream-exhaust'

const pipe = (...s) => {
  const last = s[s.length - 1]
  if (typeof last === 'function') return pipeline(...s)
  const out = pipeline(...s, (err) => {
    if (err) out.emit('error', err)
  })
  return out
}
pipe.exhaust = (...s) => ex(pipe(...s))

export default pipe

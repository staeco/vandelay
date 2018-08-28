import through2 from 'through2'
import eos from 'end-of-stream'

// merges a bunch of streams, unordered - and has some special error management
// so one wont fail the whole bunch
export default ({ onError, inputs=[] }={}) => {
  if (inputs.length === 0) throw new Error('No inputs specified!')
  let remaining = []
  const out = through2.obj()
  const done = (src, err) => {
    remaining = remaining.filter((i) => i !== src)
    // let the consumer figure out how thye want to handle errors
    if (err && onError) {
      onError({
        canContinue: remaining.length > 0,
        error: err,
        output: out,
        input: src
      })
    }
    if (!remaining.length && out.readable) out.end()
  }
  const add = (src) => {
    remaining.push(src)
    eos(src, (err) => done(src, err))
    src.pipe(out, { end: false })
  }

  out.on('unpipe', (src) => done(src))
  inputs.forEach(add)

  out.abort = () => {
    inputs.forEach((i) => {
      if (!i.readable) return
      if (i.abort) return i.abort()
      i.end()
    })
  }
  return out
}

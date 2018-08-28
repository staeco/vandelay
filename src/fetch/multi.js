import through2 from 'through2'
import eos from 'end-of-stream'

// merges a bunch of streams, unordered - and has some special error management
// so one wont fail the whole bunch
export default ({ concurrent=10, onError, inputs=[] }={}) => {
  if (inputs.length === 0) throw new Error('No inputs specified!')
  let remaining = inputs.slice() // clone
  let running = []
  const out = through2.obj()
  const done = (src, err) => {
    running = running.filter((i) => i !== src)
    schedule()
    // let the consumer figure out how thye want to handle errors
    if (err && onError) {
      onError({
        canContinue: remaining.length > 0,
        error: err,
        output: out,
        input: src
      })
    }
    if (!running.length && out.readable) out.end()
  }
  const schedule = () => {
    const toRun = concurrent - running.length
    for (let i = 0; i <= toRun; i++) {
      if (remaining.length === 0) return
      run(remaining.shift())
    }
  }
  const run = (src) => {
    running.push(src)
    eos(src, (err) => done(src, err))
    src.pipe(out, { end: false })
  }

  out.abort = () => {
    inputs.forEach((i) => {
      if (!i.readable) return
      if (i.abort) return i.abort()
      i.end()
    })
  }
  out.on('unpipe', (src) => done(src))


  schedule() // kick it all off
  return out
}

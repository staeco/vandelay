import through2 from 'through2'
import eos from 'end-of-stream'
import hardClose from '../hardClose'

// merges a bunch of streams, unordered - and has some special error management
// so one wont fail the whole bunch
export default ({ concurrent=10, onError, inputs=[] }={}) => {
  if (inputs.length === 0) throw new Error('No inputs specified!')
  const remaining = inputs.slice(0)
  let running = []
  const out = through2.obj()
  out.setMaxListeners(0)

  const done = (src, err) => {
    const idx = running.indexOf(src)
    if (idx === -1) return // already finished
    running.splice(idx, 1) // remove it from the run list
    schedule() // schedule any additional work
    const finished = running.length === 0 && remaining.length === 0

    // let the consumer figure out how thye want to handle errors
    const canContinue = !finished && out.readable
    if (err && onError) {
      onError({
        canContinue,
        error: err,
        output: out,
        input: src
      })
    }
    if (!canContinue) hardClose(out)
  }
  const schedule = () => {
    const toRun = concurrent - running.length
    if (toRun === 0) return
    for (let i = 0; i <= toRun; i++) {
      if (remaining.length === 0) break
      run(remaining.shift())
    }
  }
  const run = (i) => {
    const src = typeof i === 'function' ? i() : i
    running.push(src)
    eos(src, (err) => done(src, err))
    src.pipe(out, { end: false })
  }

  out.abort = () => {
    hardClose(out)
    inputs.forEach((i) => {
      if (!i.readable) return
      if (i.abort) return i.abort()
      hardClose(i)
    })
  }
  out.on('unpipe', (src) => done(src))

  schedule() // kick it all off
  return out
}

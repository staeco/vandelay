/* eslint no-loops/no-loops: "off" */
import through2 from 'through2'
import eos from 'end-of-stream'
import hardClose from '../hardClose'

// merges a bunch of streams, unordered - and has some special error management
// so one wont fail the whole bunch
export default ({ concurrent=10, onError, inputs=[] }={}) => {
  if (inputs.length === 0) throw new Error('No inputs specified!')

  const out = through2({ objectMode: true })
  out.remaining = inputs.slice(0)
  out.running = []
  out.setMaxListeners(0)
  out.abort = () => {
    hardClose(out)
    inputs.forEach((i) => {
      if (!i.readable) return
      if (i.abort) return i.abort()
      hardClose(i)
    })
  }
  out.on('unpipe', (src) => done(src))

  const done = (src, err) => {
    const idx = out.running.indexOf(src)
    if (idx === -1) return // already finished
    out.running.splice(idx, 1) // remove it from the run list
    schedule() // schedule any additional work
    const finished = out.running.length === 0 && out.remaining.length === 0

    // let the consumer figure out how they want to handle errors
    const canContinue = !finished && out.readable
    if (err && onError) {
      onError({
        canContinue,
        fatal: !canContinue && inputs.length === 1,
        error: err,
        output: out,
        input: src
      })
    }
    if (!canContinue) hardClose(out)
  }
  const schedule = () => {
    if (out._closed) return
    const toRun = concurrent - out.running.length
    if (toRun === 0) return
    for (let i = 0; i <= toRun; i++) {
      if (out.remaining.length === 0) break
      run(out.remaining.shift())
    }
  }
  const run = (i) => {
    const src = typeof i === 'function' ? i() : i
    out.running.push(src)
    if (!out.first) out.first = src
    eos(src, (err) => done(src, err))
    src.pipe(out, { end: false })
  }

  schedule() // kick it all off
  return out
}

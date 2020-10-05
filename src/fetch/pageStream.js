import through2 from 'through2'
import { pipeline } from 'readable-stream'
import hardClose from '../hardClose'

const getURL = (stream) =>
  stream.first
    ? getURL(stream.first)
    : typeof stream.url === 'function'
      ? stream.url()
      : stream.url


const closeIt = (i) => {
  if (!i.readable) return
  if (i.abort) return i.abort()
  hardClose(i)
}

const softClose = (i) => {
  i.end(null)
}

// merges a bunch of streams, unordered - and has some special error management
// so one wont fail the whole bunch
// keep this aligned w/ multiStream.js
export default ({ startPage=0, waitForNextPage, fetchNextPage, concurrent=2, onError }={}) => {
  // concurrency can either be 1 or 2, 2 will start loading the next page once it reads a first datum from the current page
  const actualConcurrency = Math.min(2, concurrent)
  const out = through2.obj()
  out.nextPage = startPage
  out.running = []
  out.abort = () => {
    hardClose(out)
    out.running.forEach(closeIt)
  }
  out.url = getURL.bind(null, out)

  const done = (src, err) => {
    const idx = out.running.indexOf(src)
    if (idx === -1) return // already finished
    out.running.splice(idx, 1) // remove it from the run list

    // if this stream is the first in the concurrent queue and got no data, abort
    // we hit the end of the road paging through data
    const finished = idx === 0 && !src._gotData

    // let the consumer figure out how they want to handle errors
    if (err && onError) {
      onError({
        canContinue: !finished,
        error: err,
        output: out,
        input: src
      })
    }
    finished ? softClose(out) : schedule()
  }

  const schedule = (nextPageURL) => {
    // any page past the start page, dont allow scheduling without a next URL
    if (!nextPageURL && waitForNextPage && out.nextPage !== startPage) return
    if (out._closed) return
    const remainingSlots = actualConcurrency - out.running.length
    if (remainingSlots < 1) return
    run(fetchNextPage({ nextPage: out.nextPage, nextPageURL }))
  }

  const run = (src) => {
    out.nextPage = out.nextPage + 1
    out.running.push(src)
    if (!out.first) out.first = src
    if (waitForNextPage) src.once('nextPage', schedule)
    const thisStream = pipeline(
      src,
      through2.obj((chunk, _, cb) => {
        src._gotData = true
        schedule()
        cb(null, chunk)
      }),
      (err) => {
        done(src, err)
      }
    )
    thisStream.pipe(out, { end: false })
  }

  // kick it all off
  schedule()
  return out
}

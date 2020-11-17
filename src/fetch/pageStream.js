import through2 from 'through2'
import { pipeline, finished } from 'readable-stream'
import hardClose from '../hardClose'

const maxConcurrency = 2
const getURL = (stream) =>
  stream.first
    ? getURL(stream.first)
    : typeof stream.url === 'function'
      ? stream.url()
      : stream.url

const closeIt = (i) => {
  if (!i.readable) return
  if (i.abort) {
    i._closed = true
    return i.abort()
  }
  hardClose(i)
}

const softClose = (i) => {
  i._closed = true
  i.end(null)
}

// merges a bunch of streams, unordered - and has some special error management
// so one wont fail the whole bunch
// keep this aligned w/ multiStream.js
export default ({ startPage = 0, waitForNextPage, fetchNextPage, concurrent = maxConcurrency, onError } = {}) => {
  // concurrency can either be 1 or 2, 2 will start loading the next page once it reads a first datum from the current page
  const actualConcurrency = Math.min(maxConcurrency, concurrent)
  const out = through2.obj()
  out.nextPage = startPage
  out.running = []
  out.nextPageSelectorQueue = []
  out.abort = () => {
    hardClose(out)
    out.running.forEach(closeIt)
  }
  out.url = getURL.bind(null, out)

  const done = (src, err) => {
    const idx = out.running.indexOf(src)
    if (idx === -1) return // already finished
    out.running.splice(idx, 1) // remove it from the run list

    const finished = waitForNextPage
      // if no other pages are running and we didnt get a next page, end
      ? out.running.length === 0 && out.nextPageSelectorQueue.length === 0
      // if we're the most recent stream and we had no data, end
      : idx === 0 && !src._gotData

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
    if (out._closed) return
    const remainingSlots = actualConcurrency - out.running.length
    if (remainingSlots < 1) {
      if (nextPageURL) out.nextPageSelectorQueue.push(nextPageURL)
      return
    }
    if (waitForNextPage && !nextPageURL && out.nextPage !== startPage) {
      nextPageURL = out.nextPageSelectorQueue.shift()
      if (!nextPageURL) return // nothing in queue
    }

    run(fetchNextPage({ nextPage: out.nextPage, nextPageURL }))
  }

  const run = (src) => {
    if (out._closed) return
    const fin = done.bind(null, src)
    out.nextPage = out.nextPage + 1
    out.running.push(src)
    if (!out.first) out.first = src

    // kick off selector pagination
    if (waitForNextPage) {
      src.once('nextPage', schedule)
      finished(src, fin)
      src.pipe(out, { end: false })
      return
    }

    // kick off regular pagination
    pipeline(
      src,
      through2.obj((chunk, _, cb) => {
        if (!src._gotData) {
          src._gotData = true
          schedule()
        }
        cb(null, chunk)
      }), fin)
      .pipe(out, { end: false })
  }

  // kick it all off
  schedule()
  return out
}

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


const createNextPageSelector = ({ nextPageSelector, onNextPage }) => {
  if (!nextPageSelector) {
    return through2.obj((chunk, _, cb) => {
      onNextPage()
      cb(null, chunk)
    })
  }

  // TODO: merger of src.parser, and nextPageSelector
  return through2.obj((chunk, _, cb) => {
    onNextPage()
    //console.log(chunk)
    cb(null, chunk)
  })
}

// merges a bunch of streams, unordered - and has some special error management
// so one wont fail the whole bunch
// keep this aligned w/ multiStream.js
export default ({ startPage=0, nextPageSelector, getNextPage, concurrent=2, onError }={}) => {
  // concurrency can either be 1 or 2, 2 will start loading the next page once it reads a first datum from the current page
  const actualConcurrency = Math.min(2, concurrent)
  const out = through2.obj()
  out.currentPage = startPage
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

  const schedule = () => {
    if (out._closed) return
    const remainingSlots = actualConcurrency - out.running.length
    if (remainingSlots < 1) return
    const nextPage = out.currentPage
    out.currentPage = nextPage + 1
    run(getNextPage(nextPage))
  }

  const run = (src) => {
    out.running.push(src)
    if (!out.first) out.first = src
    const thisStream = pipeline(
      src,
      createNextPageSelector({
        nextPageSelector,
        onNextPage: () => {
          src._gotData = true
          schedule()
        }
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

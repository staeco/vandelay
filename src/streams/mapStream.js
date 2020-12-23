import { Transform, PassThrough } from 'stream'
import { ParallelTransform } from 'pipeline-pipe'

const mapStream = (work, options = {}) => {
  if (!work) return new PassThrough(options)
  const concurrency = options.concurrency || 1
  if (concurrency <= 1) {
    // no concurrency needed
    const stream = new Transform(options)
    stream._transform = (chunk, _, cb) => work(chunk, cb)
    return stream
  }

  const stream = new ParallelTransform(work, {
    objectMode: false,
    maxParallel: options.concurrency,
    ...options
  })
  return stream
}

mapStream.obj = (work, options = {}) =>
  mapStream(work, {
    objectMode: true,
    ...options
  })

export default mapStream

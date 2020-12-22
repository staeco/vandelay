import { Transform, PassThrough } from 'readable-stream'

const defaultHighWaterMark = 16
const mapStream = (work, options = {}) => {
  if (!work) return new PassThrough(options)
  const concurrency = options.concurrency || 1
  if (concurrency <= 1) {
    // no concurrency needed
    const stream = new Transform(options)
    stream._transform = (chunk, _, cb) => work(chunk, cb)
    return stream
  }

  let pendingFinish
  const stream = new Transform({
    highWaterMark: Math.max(concurrency, defaultHighWaterMark),
    ...options
  })
  stream._transform = (chunk, _, cb) => {
    const exec = (cb) => {
      ++queueState.inProgress
      queueState.maxReached = Math.max(queueState.maxReached, queueState.inProgress)
      work(chunk, (err, data) => {
        if (cb) {
          cb(err, data) // eslint-disable-line
        } else {
          if (err) stream.emit('error', err)
          if (data) stream.push(data)
        }
        --queueState.inProgress
        stream.emit('free')
      })
    }

    // got space, run it
    if (queueState.inProgress < concurrency) {
      exec()
      cb()
      return
    }

    // no space, add to queue
    queueState.queue.push(exec.bind(null, cb))
    queueState.maxQueue = Math.max(queueState.maxQueue, queueState.queue.length)
  }
  stream._final = (cb) => {
    if (isQueueFinished()) {
      cb()
      return
    }
    pendingFinish = cb
  }

  // basic queue
  const queueState = stream.queueState = {
    inProgress: 0,
    maxReached: 0,
    maxQueue: 0,
    queue: []
  }
  const isQueueFinished = () =>
    queueState.inProgress === 0 && queueState.queue.length === 0
  stream.on('free', () => {
    const nextWork = queueState.queue.shift()
    if (nextWork) return nextWork()
    if (pendingFinish && isQueueFinished()) process.nextTick(pendingFinish)
  })
  return stream
}

mapStream.obj = (work, options = {}) =>
  mapStream(work, {
    objectMode: true,
    ...options
  })

export default mapStream

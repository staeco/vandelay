const { Transform, PassThrough } = require('readable-stream')

const concurrent = (transform, options = {}) => {
  if (!transform) return new PassThrough(options)
  const concurrency = options.concurrency || 1
  if (concurrency <= 1) {
    // no concurrency needed
    const stream = new PassThrough(options)
    stream._transform = transform
    return stream
  }

  let pendingFinish
  const stream = new Transform(options)
  stream._transform = (chunk, enc, cb) => {
    const work = () => {
      ++queueState.inProgress
      transform(chunk, enc, (err, data) => {
        // eslint-disable-next-line
        cb(err, data)
        --queueState.inProgress
        stream.emit('free')
        if (pendingFinish && isQueueFinished()) process.nextTick(pendingFinish)
      })
    }

    // got space, run it
    if (queueState.inProgress < concurrency) return work()

    // no space, add to queue
    queueState.queue.push(work)
  }
  stream._flush = (cb) => {
    if (isQueueFinished()) {
      cb()
      return
    }
    pendingFinish = cb
  }

  // basic queue
  const queueState = stream.queueState = {
    inProgress: 0,
    queue: []
  }
  const isQueueFinished = () =>
    queueState.inProgress === 0 && queueState.queue.length === 0
  stream.on('free', () => {
    const nextWork = queueState.queue.shift()
    if (nextWork) nextWork()
  })
  return stream
}
concurrent.obj = (transform, options = {}) =>
  concurrent(transform, {
    objectMode: true,
    highWaterMark: 16,
    ...options
  })

export default concurrent

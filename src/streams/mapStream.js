import { Transform, PassThrough } from 'readable-stream'

const mapStream = (work, options = {}) => {
  if (!work) return new PassThrough(options)
  const concurrency = options.concurrency || 1
  if (concurrency <= 1) {
    // no concurrency needed
    const stream = new Transform(options)
    stream._transform = work
    return stream
  }

  const stream = new Transform(options)
  const queueState = stream.queueState = {
    inProgress: 0,
    inQueue: 0,
    maxReached: 0,
    maxQueue: 0
  }

  function fail(err) {
    if (!stream._writableState.errorEmitted) {
      stream._writableState.errorEmitted = true
      stream.emit('error', err)
    }
  }

  stream._transform = function (chunk, enc, callback) {
    if (queueState.inProgress >= concurrency) {
      ++queueState.inQueue
      queueState.maxQueue = Math.max(queueState.maxQueue, queueState.inQueue)
      return stream.once('free', () => {
        --queueState.inQueue
        stream._transform(chunk, enc, callback)
      })
    }

    ++queueState.inProgress
    queueState.maxReached = Math.max(queueState.maxReached, queueState.inProgress)
    work.call(stream, chunk, enc, (err, data) => {
      --queueState.inProgress
      if (err) fail(err)
      else if (data) stream.push(data)
      stream.emit('free')
    })

    callback()
  }

  const end = stream.end.bind(stream)

  stream.end = function (chunk, enc, callback) {
    if (queueState.inProgress) {
      return stream.once('free', () => {
        stream.end(chunk, enc, callback)
      })
    }

    if (typeof chunk === 'function') {
      callback = chunk
      chunk = null
    }

    if (typeof enc === 'function') {
      callback = enc
      enc = null
    }

    if (chunk) {
      stream.write(chunk, enc)
      return stream.once('free', () => {
        stream.end(callback)
      })
    }

    if (callback) stream.on('finish', callback)
    if (stream._writableState.errorEmitted) return

    end()
  }

  return stream
}

mapStream.obj = (work, options = {}) =>
  mapStream(work, {
    objectMode: true,
    highWaterMark: 16,
    ...options
  })

export default mapStream

"use strict";

exports.__esModule = true;
exports.default = void 0;

const {
  Transform,
  PassThrough
} = require('readable-stream');

const concurrent = (transform, options = {}) => {
  if (!transform) return new PassThrough(options);
  const concurrency = options.concurrency || 1;

  if (concurrency <= 1) {
    // no concurrency needed
    const stream = new Transform(options);
    stream._transform = transform;
    return stream;
  }

  let pendingFinish;
  const stream = new Transform(options);

  stream._transform = (chunk, enc, cb) => {
    const work = cb => {
      ++queueState.inProgress;
      queueState.maxReached = Math.max(queueState.maxReached, queueState.inProgress);
      transform(chunk, enc, (err, data) => {
        if (cb) {
          cb(err, data); // eslint-disable-line
        } else {
          if (err) stream.emit('error', err);
          if (data) stream.push(data);
        }

        --queueState.inProgress;
        stream.emit('free');
        if (pendingFinish && isQueueFinished()) process.nextTick(pendingFinish);
      });
    }; // got space, run it


    if (queueState.inProgress < concurrency) {
      work();
      cb();
      return;
    } // no space, add to queue


    queueState.queue.push(work.bind(null, cb));
    queueState.maxQueue = Math.max(queueState.maxQueue, queueState.queue.length);
  };

  stream._flush = cb => {
    if (isQueueFinished()) {
      cb();
      return;
    }

    pendingFinish = cb;
  }; // basic queue


  const queueState = stream.queueState = {
    inProgress: 0,
    maxReached: 0,
    maxQueue: 0,
    queue: []
  };

  const isQueueFinished = () => queueState.inProgress === 0 && queueState.queue.length === 0;

  stream.on('free', () => {
    const nextWork = queueState.queue.shift();
    if (nextWork) nextWork();
  });
  return stream;
};

concurrent.obj = (transform, options = {}) => concurrent(transform, {
  objectMode: true,
  highWaterMark: 16,
  ...options
});

var _default = concurrent;
exports.default = _default;
module.exports = exports.default;
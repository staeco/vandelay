"use strict";

exports.__esModule = true;
exports.default = void 0;
var _stream = require("stream");
var _pipelinePipe = require("pipeline-pipe");
const mapStream = (work, options = {}) => {
  if (!work) return new _stream.PassThrough(options);
  const concurrency = options.concurrency || 1;
  function _ref(chunk, _, cb) {
    return work(chunk, cb);
  }
  if (concurrency <= 1) {
    // no concurrency needed
    const stream = new _stream.Transform(options);
    stream._transform = _ref;
    return stream;
  }
  const stream = new _pipelinePipe.ParallelTransform(work, {
    objectMode: false,
    maxParallel: options.concurrency,
    ...options
  });
  return stream;
};
mapStream.obj = (work, options = {}) => mapStream(work, {
  objectMode: true,
  ...options
});
var _default = mapStream;
exports.default = _default;
module.exports = exports.default;
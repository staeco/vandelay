'use strict';

exports.__esModule = true;

var _through2Concurrent = require('through2-concurrent');

var _through2Concurrent2 = _interopRequireDefault(_through2Concurrent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = (opt = {}) => {
  const maxConcurrency = opt.concurrency != null ? opt.concurrency : 10;
  const normalize = (row, _, cb) => {
    // strip internal crap back off
    if (row && typeof row === 'object') delete row.___meta;
    cb(null, row);
  };
  return _through2Concurrent2.default.obj({
    maxConcurrency,
    highWaterMark: Math.max(maxConcurrency * 2, 32)
  }, normalize);
};

module.exports = exports.default;
'use strict';

exports.__esModule = true;

var _through2Concurrent = require('through2-concurrent');

var _through2Concurrent2 = _interopRequireDefault(_through2Concurrent);

var _lodash = require('lodash.clone');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = (fn, opt = {}) => {
  if (typeof fn !== 'function') throw new Error('Invalid function!');
  const maxConcurrency = opt.concurrency != null ? opt.concurrency : 10;

  const tap = (row, _, cb) => {
    let meta;
    // pluck the ___meta attr we attached in fetch
    if (row && typeof row === 'object') {
      meta = row.___meta;
      delete row.___meta;
    }
    fn(row, meta).catch(cb).then(res => {
      if (res == null) return cb();
      if (meta) {
        res = (0, _lodash2.default)(res);
        res.___meta = meta;
      }
      cb(null, res);
    });
  };
  return _through2Concurrent2.default.obj({
    maxConcurrency,
    highWaterMark: Math.max(maxConcurrency * 2, 32)
  }, tap);
};

module.exports = exports.default;
"use strict";

exports.__esModule = true;
exports.default = void 0;

var _through2Concurrent = _interopRequireDefault(require("through2-concurrent"));

var _lodash = _interopRequireDefault(require("lodash.clone"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = (fn, opt = {}) => {
  if (typeof fn !== 'function') throw new Error('Invalid function!');
  const maxConcurrency = opt.concurrency != null ? opt.concurrency : 10;

  const tap = (row, _, cb) => {
    let meta; // pluck the ___meta attr we attached in fetch

    if (row && typeof row === 'object') {
      meta = row.___meta;
      delete row.___meta;
    }

    fn(row, meta).then(res => {
      if (res == null) return cb();

      if (meta) {
        res = (0, _lodash.default)(res);
        res.___meta = meta;
      }

      cb(null, res);
    }).catch(cb);
  };

  return _through2Concurrent.default.obj({
    maxConcurrency,
    highWaterMark: Math.max(maxConcurrency * 2, 32)
  }, tap);
};

exports.default = _default;
module.exports = exports.default;
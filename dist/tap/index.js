"use strict";

exports.__esModule = true;
exports.default = void 0;

var _through = _interopRequireDefault(require("through2"));

var _lodash = require("lodash");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = (fn, opt = {}) => {
  if (typeof fn !== 'function') throw new Error('Invalid function!');
  const maxConcurrency = opt.concurrency != null ? opt.concurrency : 8;

  const tap = (row, _, cb) => {
    let meta; // pluck the ___meta attr we attached in fetch

    if (row && typeof row === 'object') {
      meta = row.___meta;
      delete row.___meta;
    }

    fn(row, meta).then(res => {
      if (res == null) return cb();

      if (meta) {
        res = (0, _lodash.clone)(res);
        res.___meta = meta;
      }

      cb(null, res);
    }).catch(cb);
  };

  return (0, _through.default)({
    objectMode: true,
    highWaterMark: Math.min(16, maxConcurrency * 2)
  }, tap);
};

exports.default = _default;
module.exports = exports.default;
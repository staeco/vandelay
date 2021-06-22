"use strict";

exports.__esModule = true;
exports.default = void 0;

var _lodash = require("lodash");

var _mapStream = _interopRequireDefault(require("../streams/mapStream"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const defaultConcurrency = 8;

var _default = (fn, opt = {}) => {
  if (typeof fn !== 'function') throw new Error('Invalid function!');
  const concurrency = opt.concurrency != null ? opt.concurrency : defaultConcurrency;

  const tap = (row, cb) => {
    let meta; // pluck the ___meta attr we attached in fetch

    if (row != null && row.___meta) {
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

  return _mapStream.default.obj(tap, {
    concurrency
  });
};

exports.default = _default;
module.exports = exports.default;
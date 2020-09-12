"use strict";

exports.__esModule = true;
exports.default = void 0;

var _bluestream = require("bluestream");

var _lodash = require("lodash");

var _default = (fn, opt = {}) => {
  if (typeof fn !== 'function') throw new Error('Invalid function!');
  const maxConcurrency = opt.concurrency != null ? opt.concurrency : 8;

  const tap = async row => {
    let meta; // pluck the ___meta attr we attached in fetch

    if (row && typeof row === 'object') {
      meta = row.___meta;
      delete row.___meta;
    }

    let res = await fn(row, meta);
    if (res == null) return;

    if (meta) {
      res = (0, _lodash.clone)(res);
      res.___meta = meta;
    }

    return res;
  };

  return (0, _bluestream.transform)({
    concurrent: maxConcurrency,
    highWaterMark: Math.max(16, maxConcurrency * 2)
  }, tap);
};

exports.default = _default;
module.exports = exports.default;
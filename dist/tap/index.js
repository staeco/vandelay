'use strict';

exports.__esModule = true;

var _bluestream = require('bluestream');

var _lodash = require('lodash.clone');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = (fn, opt = {}) => {
  if (typeof fn !== 'function') throw new Error('Invalid function!');
  const concurrent = opt.concurrency != null ? opt.concurrency : 10;

  const tap = async row => {
    let meta;
    // pluck the ___meta attr we attached in fetch
    if (row && typeof row === 'object') {
      meta = row.___meta;
      delete row.___meta;
    }
    row = await fn(row, meta);
    if (row == null) return;
    if (meta) {
      row = (0, _lodash2.default)(row);
      row.___meta = meta;
    }
    return row;
  };
  return (0, _bluestream.transform)({
    concurrent,
    highWaterMark: concurrent
  }, tap);
};

module.exports = exports.default;
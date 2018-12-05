'use strict';

exports.__esModule = true;

var _bluestream = require('bluestream');

exports.default = (opt = {}) => {
  const concurrent = opt.concurrency != null ? opt.concurrency : 50;
  const normalize = async row => {
    // strip internal crap back off
    if (row && typeof row === 'object') delete row.___meta;
    return row;
  };
  return (0, _bluestream.transform)({
    concurrent,
    highWaterMark: concurrent
  }, normalize);
};

module.exports = exports.default;
"use strict";

exports.__esModule = true;
exports.default = void 0;

var _through2Concurrent = _interopRequireDefault(require("through2-concurrent"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = (opt = {}) => {
  const maxConcurrency = opt.concurrency != null ? opt.concurrency : 10;

  const normalize = (row, _, cb) => {
    // strip internal crap back off
    if (row && typeof row === 'object') delete row.___meta;
    cb(null, row);
  };

  return _through2Concurrent.default.obj({
    maxConcurrency,
    highWaterMark: Math.max(maxConcurrency * 2, 32)
  }, normalize);
};

exports.default = _default;
module.exports = exports.default;
'use strict';

exports.__esModule = true;

var _bluestream = require('bluestream');

var _bluestream2 = _interopRequireDefault(_bluestream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = (fn, opt = {}) => {
  if (typeof fn !== 'function') throw 'Invalid function!';

  const tap = async record => {
    // pluck the _meta attr we attached in fetch
    const meta = record.___meta;
    delete record.___meta;
    record = await fn(record, meta);
    if (!record) return;
    if (meta) record.___meta = meta; // tack meta back on
    return record;
  };
  return _bluestream2.default.transform({
    concurrent: opt.concurrency != null ? opt.concurrency : 50
  }, tap);
};

module.exports = exports['default'];
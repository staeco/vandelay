'use strict';

exports.__esModule = true;

var _parseDecimalNumber = require('parse-decimal-number');

var _parseDecimalNumber2 = _interopRequireDefault(_parseDecimalNumber);

var _parse = require('date-fns/parse');

var _parse2 = _interopRequireDefault(_parse);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = v => {
  if (typeof v !== 'string') return v; // already parsed upstream!
  v = v.trim();
  if (!v) return;
  if (v === '-') return null;
  if (v === 'NaN') return NaN;
  const lower = v.toLowerCase();
  if (lower === 'null') return null;
  if (lower === 'undefined') return;
  if (lower === 'true' || lower === 'yes' || lower === 'y') return true;
  if (lower === 'false' || lower === 'no' || lower === 'n') return false;

  const n = (0, _parseDecimalNumber2.default)(v);
  if (!isNaN(n)) return n;

  const d = (0, _parse2.default)(v);
  if (!isNaN(d)) return d;

  return v;
};

module.exports = exports['default'];
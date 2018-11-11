'use strict';

exports.__esModule = true;

var _parseDecimalNumber = require('parse-decimal-number');

var _parseDecimalNumber2 = _interopRequireDefault(_parseDecimalNumber);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const auto = v => {
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

  const d = new Date(v);
  if (!isNaN(d)) return d;

  try {
    return JSON.parse(v);
  } catch (e) {
    // not json
  }

  return v;
};

exports.default = auto;
module.exports = exports.default;
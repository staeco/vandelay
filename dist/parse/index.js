'use strict';

exports.__esModule = true;

var _formats = require('./formats');

var formats = _interopRequireWildcard(_formats);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

exports.default = (format, opt = {}) => {
  if (typeof format !== 'string') throw new Error('Invalid format argument');
  const fmt = formats[format];
  if (!fmt) throw new Error(`${format} is not a support parser format`);
  const out = () => fmt(opt);
  out(); // create a test one to validate the options
  return out;
};

module.exports = exports['default'];
'use strict';

exports.__esModule = true;

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _pumpify = require('pumpify');

var _pumpify2 = _interopRequireDefault(_pumpify);

var _lodash = require('lodash.omit');

var _lodash2 = _interopRequireDefault(_lodash);

var _isPlainObject = require('is-plain-object');

var _isPlainObject2 = _interopRequireDefault(_isPlainObject);

var _removeBomStream = require('remove-bom-stream');

var _removeBomStream2 = _interopRequireDefault(_removeBomStream);

var _formats = require('./formats');

var formats = _interopRequireWildcard(_formats);

var _autoFormat = require('../autoFormat');

var autoFormat = _interopRequireWildcard(_autoFormat);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = (format, opt = {}) => {
  if (typeof format !== 'string') throw new Error('Invalid format argument');
  const fmt = formats[format];
  if (!fmt) throw new Error(`${format} is not a support parser format`);
  if (opt.autoFormat && !autoFormat[opt.autoFormat]) throw new Error('Invalid autoFormat option');
  fmt(opt); // create a test one to validate the options
  if (!opt.autoFormat) return () => fmt(opt);
  return () => {
    const head = fmt(opt);
    const tail = _through2.default.obj((row, _, cb) => {
      // fun dance to retain the json header field needed for our metadata
      const nrow = (0, _isPlainObject2.default)(row) ? (0, _lodash2.default)(row, '___header') : row;
      const out = autoFormat[opt.autoFormat](nrow);
      if (row.___header) out.___header = row.___header;
      cb(null, out);
    });
    return _pumpify2.default.obj((0, _removeBomStream2.default)(), head, tail);
  };
};

module.exports = exports.default;
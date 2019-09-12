"use strict";

exports.__esModule = true;
exports.default = void 0;

var _through = _interopRequireDefault(require("through2"));

var _pumpify = _interopRequireDefault(require("pumpify"));

var _lodash = _interopRequireDefault(require("lodash.omit"));

var _isPlainObj = _interopRequireDefault(require("is-plain-obj"));

var _removeBomStream = _interopRequireDefault(require("remove-bom-stream"));

var formats = _interopRequireWildcard(require("./formats"));

var autoFormat = _interopRequireWildcard(require("../autoFormat"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = (format, opt = {}) => {
  if (typeof format !== 'string') throw new Error('Invalid format argument');
  const fmt = formats[format];
  if (!fmt) throw new Error(`${format} is not a support parser format`);
  if (opt.autoFormat && !autoFormat[opt.autoFormat]) throw new Error('Invalid autoFormat option');
  fmt(opt); // create a test one to validate the options

  if (!opt.autoFormat) return () => fmt(opt);
  return () => {
    const head = fmt(opt);

    const tail = _through.default.obj((row, _, cb) => {
      // fun dance to retain the json header field needed for our metadata
      const nrow = (0, _isPlainObj.default)(row) ? (0, _lodash.default)(row, '___header') : row;
      const out = autoFormat[opt.autoFormat](nrow);
      if (row.___header) out.___header = row.___header;
      cb(null, out);
    });

    return _pumpify.default.obj((0, _removeBomStream.default)(), head, tail);
  };
};

exports.default = _default;
module.exports = exports.default;
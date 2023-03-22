"use strict";

exports.__esModule = true;
exports.default = void 0;
var _pumpify = _interopRequireDefault(require("pumpify"));
var _lodash = require("lodash");
var _isPlainObj = _interopRequireDefault(require("is-plain-obj"));
var _removeBomStream = _interopRequireDefault(require("remove-bom-stream"));
var _mapStream = _interopRequireDefault(require("../streams/mapStream"));
var formats = _interopRequireWildcard(require("./formats"));
var autoFormat = _interopRequireWildcard(require("../autoFormat"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
var _default = (format, opt = {}) => {
  if (typeof format !== 'string') throw new Error('Invalid format argument');
  const fmt = formats[format];
  if (!fmt) throw new Error(`${format} is not a supported parser format`);
  if (opt.autoFormat && !autoFormat[opt.autoFormat]) throw new Error('Invalid autoFormat option');
  fmt(opt); // just to validate!
  if (!opt.autoFormat) return () => fmt(opt);
  function _ref(row, cb) {
    // fun dance to retain the json header field needed for our metadata
    const nrow = (0, _isPlainObj.default)(row) ? (0, _lodash.omit)(row, '___header') : row;
    const out = autoFormat[opt.autoFormat](nrow);
    if (row.___header) out.___header = row.___header;
    cb(null, out);
  }
  return () => {
    const head = fmt(opt);
    const tail = _mapStream.default.obj(_ref);
    return _pumpify.default.obj((0, _removeBomStream.default)(), head, tail);
  };
};
exports.default = _default;
module.exports = exports.default;
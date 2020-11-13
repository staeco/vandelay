"use strict";

exports.__esModule = true;
exports.default = exports.formats = void 0;

var _pumpify = _interopRequireDefault(require("pumpify"));

var _jsonstreamPaths = _interopRequireDefault(require("jsonstream-paths"));

var _isPlainObj = _interopRequireDefault(require("is-plain-obj"));

var _exceljsTransformStream = require("exceljs-transform-stream");

var _xml2json = _interopRequireDefault(require("./parse/xml2json"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// only return paths where there are objects
const jsonSelectorFilter = (path, value, isIterable) => {
  if (!isIterable) return false;
  if (path === '*' && value == null && !isIterable) return false;
  if (value == null) return true; // null = some asterisk returned an object

  if (Array.isArray(value)) return value.every(_isPlainObj.default);
  return true;
};

const jsonParser = () => (0, _jsonstreamPaths.default)({
  filter: jsonSelectorFilter
});

const selectorParsers = {
  json: jsonParser,
  xml: jsonParser,
  html: jsonParser,
  excel: _exceljsTransformStream.getSelectors
};
const serializers = {
  xml: _xml2json.default,
  html: (opt = {}) => (0, _xml2json.default)(_objectSpread(_objectSpread({}, opt), {}, {
    strict: false
  }))
};
const formats = Object.keys(selectorParsers);
exports.formats = formats;

var _default = (parser, parserOptions) => {
  if (!selectorParsers[parser]) throw new Error('Invalid parser - does not support selectors');
  const parse = selectorParsers[parser](parserOptions);
  if (!serializers[parser]) return parse;
  return _pumpify.default.obj(serializers[parser](parserOptions), parse);
};

exports.default = _default;
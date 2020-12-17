"use strict";

exports.__esModule = true;
exports.default = exports.formats = void 0;

var _pumpify = _interopRequireDefault(require("pumpify"));

var _jsonstreamPaths = _interopRequireDefault(require("jsonstream-paths"));

var _isPlainObj = _interopRequireDefault(require("is-plain-obj"));

var _xlsxParseStream = require("xlsx-parse-stream");

var _xml2json = _interopRequireDefault(require("./parse/xml2json"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
  excel: _xlsxParseStream.getSelectors
};
const serializers = {
  xml: _xml2json.default,
  html: (opt = {}) => (0, _xml2json.default)({ ...opt,
    strict: false
  })
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
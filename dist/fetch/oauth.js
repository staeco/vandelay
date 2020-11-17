"use strict";

exports.__esModule = true;
exports.getToken = void 0;

var _superagent = _interopRequireDefault(require("superagent"));

var _lodash = require("lodash");

var _userAgent = _interopRequireDefault(require("./userAgent"));

var _httpError = _interopRequireDefault(require("./httpError"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const maxRetries = 10;
const timeout = 30000;

function _ref(v, k) {
  return !!k && !!v;
}

function _ref2(err) {
  throw (0, _httpError.default)(err, err.response && err.response.res);
}

const getToken = async oauth => {
  const rest = (0, _lodash.omit)(oauth.grant, ['url', 'type']);
  const res = await _superagent.default.post(oauth.grant.url).type('form').accept('json').send((0, _lodash.pickBy)(_objectSpread({
    grant_type: oauth.grant.type
  }, rest), _ref)).set({
    'Cache-Control': 'no-cache',
    'User-Agent': _userAgent.default
  }).retry(maxRetries).timeout(timeout).catch(_ref2);
  return res.body.access_token;
};

exports.getToken = getToken;
"use strict";

exports.__esModule = true;
exports.getToken = void 0;

var _superagent = _interopRequireDefault(require("superagent"));

var _lodash = _interopRequireDefault(require("lodash.omit"));

var _lodash2 = _interopRequireDefault(require("lodash.pickby"));

var _userAgent = _interopRequireDefault(require("./userAgent"));

var _httpError = _interopRequireDefault(require("./httpError"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const getToken = async oauth => {
  const rest = (0, _lodash.default)(oauth.grant, ['url', 'type']);
  const res = await _superagent.default.post(oauth.grant.url).type('form').accept('json').send((0, _lodash2.default)(_objectSpread({
    grant_type: oauth.grant.type
  }, rest), (v, k) => !!k && !!v)).set({
    'Cache-Control': 'no-cache',
    'User-Agent': _userAgent.default
  }).retry(10).timeout(30000).catch(err => {
    throw (0, _httpError.default)(err, err.response && err.response.res);
  });
  return res.body.access_token;
};

exports.getToken = getToken;
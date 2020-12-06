"use strict";

exports.__esModule = true;
exports.getToken = void 0;

var _superagent = _interopRequireDefault(require("superagent"));

var _lodash = require("lodash");

var _userAgent = _interopRequireDefault(require("./userAgent"));

var _httpError = _interopRequireDefault(require("./httpError"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
  const res = await _superagent.default.post(oauth.grant.url).type('form').accept('json').send((0, _lodash.pickBy)({
    grant_type: oauth.grant.type,
    ...rest
  }, _ref)).set({
    'Cache-Control': 'no-cache',
    'User-Agent': _userAgent.default
  }).retry(maxRetries).timeout(timeout).catch(_ref2);
  return res.body.access_token;
};

exports.getToken = getToken;
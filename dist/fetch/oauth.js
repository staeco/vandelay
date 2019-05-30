'use strict';

exports.__esModule = true;
exports.getToken = undefined;

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _lodash = require('lodash.omit');

var _lodash2 = _interopRequireDefault(_lodash);

var _lodash3 = require('lodash.pickby');

var _lodash4 = _interopRequireDefault(_lodash3);

var _userAgent = require('./userAgent');

var _userAgent2 = _interopRequireDefault(_userAgent);

var _httpError = require('./httpError');

var _httpError2 = _interopRequireDefault(_httpError);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const getToken = exports.getToken = async oauth => {
  const rest = (0, _lodash2.default)(oauth.grant, ['url', 'type']);
  const res = await _superagent2.default.post(oauth.grant.url).type('form').accept('json').send((0, _lodash4.default)(Object.assign({
    grant_type: oauth.grant.type
  }, rest))).set({
    'Cache-Control': 'no-cache',
    'User-Agent': _userAgent2.default
  }).retry(10).timeout(30000).catch(err => {
    throw (0, _httpError2.default)(err, err.response && err.response.res);
  });

  return res.body.access_token;
};
'use strict';

exports.__esModule = true;

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _superagentRetryDelay = require('superagent-retry-delay');

var _superagentRetryDelay2 = _interopRequireDefault(_superagentRetryDelay);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _superagentRetryDelay2.default)(_superagent2.default); // hook it

exports.default = url => {
  const out = (0, _through2.default)();
  const req = _superagent2.default.get(url).buffer(false).redirects(10).retry(10, 5000, [401, 404]).once('response', res => {
    if (res.error) out.emit('error', res.error);
  }).once('error', err => out.emit('error', err));
  return req.pipe(out);
};

module.exports = exports['default'];
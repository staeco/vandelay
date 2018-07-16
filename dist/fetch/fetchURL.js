'use strict';

exports.__esModule = true;

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const rewriteError = err => {
  if (err.status) return new Error(`HTTP Error ${err.status} received!`);
  if (err.code === 'ENOTFOUND') return new Error('Failed to resolve host!');
  if (err.code === 'ECONNRESET') return new Error('Connection to host was lost!');
  return new Error('Failed to connect to host!');
};

exports.default = url => {
  const out = (0, _through2.default)();
  const req = _superagent2.default.get(url).buffer(false).redirects(10).retry(10).once('response', res => {
    if (res.error) {
      const nerror = rewriteError(res.error);
      nerror.code = res.code;
      nerror.status = res.status;
      out.emit('error', nerror);
    }
  }).once('error', err => {
    const nerror = rewriteError(err);
    nerror.code = err.code;
    nerror.status = err.status;
    out.emit('error', nerror);
  });
  return req.pipe(out);
};

module.exports = exports['default'];
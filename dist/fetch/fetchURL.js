'use strict';

exports.__esModule = true;

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _getStream = require('get-stream');

var _getStream2 = _interopRequireDefault(_getStream);

var _pump = require('pump');

var _pump2 = _interopRequireDefault(_pump);

var _httpStatusCodes = require('http-status-codes');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const sizeLimit = 512000; // 512kb
const rewriteError = err => {
  if (err.status) return new Error(`Server responded with "${(0, _httpStatusCodes.getStatusText)(err.status)}"`);
  if (err.code === 'ENOTFOUND') return new Error('Failed to resolve host');
  if (err.code === 'ECONNRESET') return new Error('Connection to host was lost');
  return new Error('Failed to connect to host');
};
const httpError = (err, res) => {
  const nerror = rewriteError(err);
  nerror.requestError = true;
  nerror.code = res.code;
  nerror.status = res.status;
  nerror.headers = res.headers;
  nerror.body = res.text;
  return nerror;
};

exports.default = url => {
  let haltEnd = false;
  const out = (0, _through2.default)();
  const errCollector = (0, _through2.default)();
  const req = _superagent2.default.get(url).buffer(false).redirects(10).retry(10)
  // http errors
  .once('response', async res => {
    if (!res.error) return;
    haltEnd = true;
    res.text = await (0, _getStream2.default)(errCollector, { maxBuffer: sizeLimit });
    out.emit('error', httpError(res.error, res));
    out.end();
  })
  // network errors
  .once('error', err => {
    out.emit('error', httpError(err, err));
  });

  const inp = (0, _pump2.default)(req, errCollector, () => {
    if (!haltEnd) out.end();
  });
  out.req = req;
  return inp.pipe(out, { end: false });
};

module.exports = exports['default'];
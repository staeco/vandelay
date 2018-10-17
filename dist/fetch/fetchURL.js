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
  if (err.code === 'ENOTFOUND') return new Error('Failed to resolve server host');
  if (err.code === 'ECONNRESET') return new Error('Connection to server was lost');
  if (err.timeout) return new Error('Server took too long to respond');
  return new Error('Failed to connect to server');
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

exports.default = (url, { timeout } = {}) => {
  let haltEnd = false;
  const out = (0, _through2.default)();
  const errCollector = (0, _through2.default)();
  const close = () => {
    const fn = out.end.bind(out);
    if (out._writableState.length === 0) return process.nextTick(fn);
    out.once('drain', fn);
  };
  let req = _superagent2.default.get(url).buffer(false).redirects(10).retry(10);
  if (timeout) req = req.timeout(timeout);

  req
  // http errors
  .once('response', async res => {
    if (!res.error) return;
    haltEnd = true;
    res.text = await (0, _getStream2.default)(errCollector, { maxBuffer: sizeLimit });
    out.emit('error', httpError(res.error, res));
    close();
  })
  // network errors
  .once('error', err => {
    out.emit('error', httpError(err, err));
  });

  const inp = (0, _pump2.default)(req, errCollector, () => {
    if (!haltEnd) close();
  });
  out.abort = req.abort.bind(req);
  return inp.pipe(out, { end: false });
};

module.exports = exports.default;
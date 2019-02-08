'use strict';

exports.__esModule = true;

var _gotResume = require('got-resume');

var _gotResume2 = _interopRequireDefault(_gotResume);

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _getStream = require('get-stream');

var _getStream2 = _interopRequireDefault(_getStream);

var _pump = require('pump');

var _pump2 = _interopRequireDefault(_pump);

var _urlTemplate = require('url-template');

var _urlTemplate2 = _interopRequireDefault(_urlTemplate);

var _hardClose = require('../hardClose');

var _hardClose2 = _interopRequireDefault(_hardClose);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const sizeLimit = 512000; // 512kb
const rewriteError = err => {
  if (err.statusCode) return new Error(`Server responded with "${err.statusMessage}"`);
  if (err.code === 'ENOTFOUND') return new Error('Failed to resolve server host');
  if (err.code === 'ECONNRESET') return new Error('Connection to server was lost');
  if (typeof err.code === 'string' && err.code.includes('TIMEDOUT')) return new Error('Server took too long to respond');
  return new Error('Failed to connect to server');
};
const httpError = (err, res) => {
  const nerror = rewriteError(err);
  nerror.requestError = true;
  nerror.code = err.code;
  nerror.status = res && res.statusCode;
  nerror.headers = res && res.headers;
  nerror.body = res && res.text;
  return nerror;
};
const oneDay = 86400000;

exports.default = (url, { attempts = 10, headers, timeout, log, context } = {}) => {
  const decoded = unescape(url);
  const fullURL = context && decoded.includes('{') ? _urlTemplate2.default.parse(decoded).expand(context) : url;

  const out = (0, _through2.default)();
  let isCollectingError = false;

  const options = {
    log,
    attempts,
    got: {
      followRedirects: true,
      timeout: {
        request: timeout || oneDay,
        connect: oneDay,
        socket: oneDay
      },
      headers
    }
  };

  const req = (0, _gotResume2.default)(fullURL, options)
  // handle errors
  .once('error', async err => {
    isCollectingError = true;
    const original = err.original || err;
    const { res } = original;
    if (res) res.text = await (0, _getStream2.default)(res, { maxBuffer: sizeLimit });
    out.emit('error', httpError(original, res));
    out.abort();
  }).once('response', () => {
    if (isCollectingError) return;
    (0, _pump2.default)(req, out);
  });

  out.abort = () => {
    (0, _hardClose2.default)(out);
    req.cancel();
  };
  out.req = req;
  out.url = fullURL;
  return out;
};

module.exports = exports.default;
"use strict";

exports.__esModule = true;
exports.default = void 0;

var _gotResumeNext = _interopRequireDefault(require("got-resume-next"));

var _getStream = _interopRequireDefault(require("get-stream"));

var _stream = require("stream");

var _urlTemplate = _interopRequireDefault(require("url-template"));

var _toughCookie = require("tough-cookie");

var _lodash = require("lodash");

var _httpError = _interopRequireDefault(require("./httpError"));

var _userAgent = _interopRequireDefault(require("./userAgent"));

var _hardClose = _interopRequireDefault(require("../hardClose"));

var _mergeURL = _interopRequireDefault(require("../mergeURL"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const sizeLimit = 512000; // 512kb

const oneDay = 86400000;
const fiveMinutes = 300000;

function _ref(acc, [k, v]) {
  acc[k.toLowerCase()] = v;
  return acc;
}

const lowerObj = o => Object.entries(o).reduce(_ref, {});

const retryWorthyStatuses = [420, 444, 408, 429, 449, 499];
const retryWorthyCodes = ['ECONNRESET', 'ECONNREFUSED', 'ECONNABORTED', 'ENETDOWN', 'ENETRESET', 'ENETUNREACH', 'EHOSTUNREACH', 'EHOSTDOWN'];

const shouldRetry = (_, original) => {
  if (!original) return false; // malformed error

  if (retryWorthyCodes.includes(original.code)) return true;
  const res = original.response;
  if (!res) return false; // non-http error?
  // they don't like the rate we are sending at

  if (retryWorthyStatuses.includes(res.statusCode)) return true; // their server having issues, give it another go

  if (res.statusCode >= 500) return true; // they don't like what we're sending, no point retrying

  if (res.statusCode >= 400) return false;
  return true;
};

function _ref2(v, k) {
  return !!k && !!v;
}

var _default = (url, {
  attempts = 10,
  headers = {},
  query,
  timeout,
  connectTimeout,
  accessToken,
  cookieJar = new _toughCookie.CookieJar(),
  debug,
  context
} = {}) => {
  const decoded = unescape(url);
  let fullURL = context && decoded.includes('{') ? _urlTemplate.default.parse(decoded).expand(context) : url;
  const out = new _stream.PassThrough();
  let isCollectingError = false;
  const actualHeaders = lowerObj((0, _lodash.pickBy)({
    'User-Agent': _userAgent.default,
    ...headers
  }, _ref2));
  if (accessToken) actualHeaders.authorization = `Bearer ${accessToken}`;
  if (query) fullURL = (0, _mergeURL.default)(fullURL, query);
  if (actualHeaders.cookie) cookieJar.setCookieSync(actualHeaders.cookie, fullURL);
  const options = {
    log: debug,
    attempts,
    shouldRetry,
    got: {
      followRedirect: true,
      timeout: {
        request: timeout || oneDay,
        connect: connectTimeout || fiveMinutes,
        socket: oneDay
      },
      headers: actualHeaders,
      cookieJar
    }
  };
  if (debug) debug('Fetching', fullURL);
  let req; // got throws errors on invalid headers or other invalid args, so handle them instead of throwing

  async function _ref3(err) {
    isCollectingError = true;
    const orig = err.original || err;
    if (debug) debug('Got error while fetching', orig);

    if (orig?.response) {
      orig.response.text = orig.response.rawBody ? orig.response.rawBody.toString('utf8') // for whatever reason, got buffered the response
      : await (0, _getStream.default)(orig.response, {
        maxBuffer: sizeLimit
      }); // nothing buffered - keep reading
    }

    orig.attempt = req.transfer.attempt;
    out.emit('error', (0, _httpError.default)(orig, orig?.response));
    out.abort();
  }

  function _ref4(err) {
    if (err) out.emit('error', err);
  }

  function _ref5() {
    if (isCollectingError) return;
    if (debug) debug('Got a first response, starting stream');
    (0, _stream.pipeline)(req, out, _ref4);
  }

  try {
    req = (0, _gotResumeNext.default)(fullURL, options) // handle errors
    .once('error', _ref3).once('response', _ref5);
  } catch (err) {
    process.nextTick(() => {
      out.emit('error', err);
    });
    return out;
  }

  out.abort = () => {
    if (debug) debug('Abort called');
    (0, _hardClose.default)(out);
    req.cancel();
  };

  out.req = req;
  out.url = fullURL;
  return out;
};

exports.default = _default;
module.exports = exports.default;
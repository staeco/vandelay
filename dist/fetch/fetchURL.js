"use strict";

exports.__esModule = true;
exports.default = void 0;

var _gotResumeNext = _interopRequireDefault(require("got-resume-next"));

var _through = _interopRequireDefault(require("through2"));

var _getStream = _interopRequireDefault(require("get-stream"));

var _readableStream = require("readable-stream");

var _urlTemplate = _interopRequireDefault(require("url-template"));

var _toughCookie = require("tough-cookie");

var _lodash = require("lodash");

var _httpError = _interopRequireDefault(require("./httpError"));

var _userAgent = _interopRequireDefault(require("./userAgent"));

var _hardClose = _interopRequireDefault(require("../hardClose"));

var _mergeURL = _interopRequireDefault(require("../mergeURL"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const sizeLimit = 512000; // 512kb

const oneDay = 86400000;
const fiveMinutes = 300000;

function _ref(acc, [k, v]) {
  acc[k.toLowerCase()] = v;
  return acc;
}

const lowerObj = o => Object.entries(o).reduce(_ref, {});

const retryWorthy = [420, 444, 408, 429, 449, 499];

const shouldRetry = (_, original) => {
  if (original?.code === 'ENOTFOUND') return false; // no point retrying on domains that dont exist

  const res = original?.response;
  if (!res) return false; // non-http error?
  // their server having issues, give it another go

  if (res.statusCode >= 500) return true; // they don't like the rate we are sending at

  if (retryWorthy.includes(res.statusCode)) return true; // they don't like what we're sending, no point retrying

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
  const out = (0, _through.default)();
  let isCollectingError = false;
  const actualHeaders = lowerObj((0, _lodash.pickBy)(_objectSpread({
    'User-Agent': _userAgent.default
  }, headers), _ref2));
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

    out.emit('error', (0, _httpError.default)(orig, orig?.response));
    out.abort();
  }

  function _ref4(err) {
    if (err) out.emit('error', err);
  }

  function _ref5() {
    if (isCollectingError) return;
    if (debug) debug('Got a first response, starting stream');
    (0, _readableStream.pipeline)(req, out, _ref4);
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
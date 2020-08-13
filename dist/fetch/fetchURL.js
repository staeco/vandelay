"use strict";

exports.__esModule = true;
exports.default = void 0;

var _gotResumeNext = _interopRequireDefault(require("got-resume-next"));

var _through = _interopRequireDefault(require("through2"));

var _getStream = _interopRequireDefault(require("get-stream"));

var _stream = require("stream");

var _urlTemplate = _interopRequireDefault(require("url-template"));

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
const retryWorthy = [420, 444, 408, 429, 449, 499];

const shouldRetry = (_, original) => {
  const code = original && original.code;
  const res = original && original.response; // their server having issues, give it another go

  if (res && res.statusCode >= 500) return true; // no point retry anything over 400 that will keep happening

  if (res && res.statusCode >= 400 && !retryWorthy.includes(res.statusCode)) return false; // no point retrying on domains that dont exists

  if (code === 'ENOTFOUND') return false;
  return true;
};

var _default = (url, {
  attempts = 10,
  headers = {},
  query,
  timeout,
  connectTimeout,
  accessToken,
  debug,
  context
} = {}) => {
  const decoded = unescape(url);
  let fullURL = context && decoded.includes('{') ? _urlTemplate.default.parse(decoded).expand(context) : url;
  const out = (0, _through.default)();
  let isCollectingError = false;
  const actualHeaders = (0, _lodash.pickBy)(_objectSpread({
    'User-Agent': _userAgent.default
  }, headers), (v, k) => !!k && !!v);
  if (accessToken) actualHeaders.Authorization = `Bearer ${accessToken}`;
  if (query) fullURL = (0, _mergeURL.default)(fullURL, query);
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
      headers: actualHeaders
    }
  };
  if (debug) debug('Fetching', fullURL);
  let req; // got throws errors on invalid headers or other invalid args, so handle them instead of throwing

  try {
    req = (0, _gotResumeNext.default)(fullURL, options) // handle errors
    .once('error', async err => {
      isCollectingError = true;
      const orig = err.original || err;
      if (debug) debug('Got error while fetching', orig);

      if (orig === null || orig === void 0 ? void 0 : orig.response) {
        orig.response.text = orig.response.rawBody ? orig.response.rawBody.toString('utf8') // for whatever reason, got buffered the response
        : await (0, _getStream.default)(orig.response, {
          maxBuffer: sizeLimit
        }); // nothing buffered - keep reading
      }

      out.emit('error', (0, _httpError.default)(orig, orig === null || orig === void 0 ? void 0 : orig.response));
      out.abort();
    }).once('response', () => {
      if (isCollectingError) return;
      if (debug) debug('Got a response');
      (0, _stream.pipeline)(req, out, err => {
        if (err) out.emit('error', err);
      });
    });
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
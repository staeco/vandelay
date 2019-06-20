"use strict";

exports.__esModule = true;
exports.default = void 0;

var _gotResume = _interopRequireDefault(require("got-resume"));

var _through = _interopRequireDefault(require("through2"));

var _getStream = _interopRequireDefault(require("get-stream"));

var _pump = _interopRequireDefault(require("pump"));

var _urlTemplate = _interopRequireDefault(require("url-template"));

var _lodash = _interopRequireDefault(require("lodash.pickby"));

var _httpError = _interopRequireDefault(require("./httpError"));

var _userAgent = _interopRequireDefault(require("./userAgent"));

var _hardClose = _interopRequireDefault(require("../hardClose"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const sizeLimit = 512000; // 512kb

const oneDay = 86400000;
const fiveMinutes = 300000;
const retryWorthy = [420, 444, 408, 429, 449, 499];

const shouldRetry = (_, original) => {
  const code = original && original.code;
  const res = original && original.res; // their server having issues, give it another go

  if (res && res.statusCode >= 500) return true; // no point retry anything over 400 that will keep happening

  if (res && res.statusCode >= 400 && !retryWorthy.includes(res.statusCode)) return false; // no point retrying on domains that dont exists

  if (code === 'ENOTFOUND') return false;
  return true;
};

var _default = (url, {
  attempts = 10,
  headers = {},
  timeout,
  connectTimeout,
  accessToken,
  debug,
  context
} = {}) => {
  const decoded = unescape(url);
  const fullURL = context && decoded.includes('{') ? _urlTemplate.default.parse(decoded).expand(context) : url;
  const out = (0, _through.default)();
  let isCollectingError = false;
  const actualHeaders = (0, _lodash.default)(_objectSpread({
    'User-Agent': _userAgent.default
  }, headers), (v, k) => !!k && !!v);
  if (accessToken) actualHeaders.Authorization = `Bearer ${accessToken}`;
  const options = {
    log: debug,
    attempts,
    shouldRetry,
    got: {
      followRedirects: true,
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
    req = (0, _gotResume.default)(fullURL, options) // handle errors
    .once('error', async err => {
      isCollectingError = true;
      const original = err.original || err;
      const {
        res
      } = original;
      if (debug) debug('Got error while fetching', original);
      if (res) res.text = await (0, _getStream.default)(res, {
        maxBuffer: sizeLimit
      });
      out.emit('error', (0, _httpError.default)(original, res));
      out.abort();
    }).once('response', () => {
      if (isCollectingError) return;
      if (debug) debug('Got a response');
      (0, _pump.default)(req, out);
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
"use strict";

exports.__esModule = true;
exports.default = void 0;

var _url = _interopRequireDefault(require("url"));

var _qs = _interopRequireDefault(require("qs"));

var _pumpify = _interopRequireDefault(require("pumpify"));

var _through = _interopRequireDefault(require("through2"));

var _oauth = require("./oauth");

var _fetchWithParser = _interopRequireDefault(require("./fetchWithParser"));

var _multi = _interopRequireDefault(require("./multi"));

var _page = _interopRequireDefault(require("./page"));

var _hardClose = _interopRequireDefault(require("../hardClose"));

var _parse = _interopRequireDefault(require("../parse"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const getOptions = (src, opt, accessToken) => ({
  accessToken,
  fetchURL: opt.fetchURL,
  debug: opt.debug,
  timeout: opt.timeout,
  connectTimeout: opt.connectTimeout,
  attempts: opt.attempts,
  headers: src.headers,
  context: opt.context
}); // default behavior is to fail on first error


const defaultErrorHandler = ({
  error,
  output
}) => {
  output.emit('error', error);
};

const mergeURL = (origUrl, newQuery) => {
  const sourceUrl = _url.default.parse(origUrl);

  const query = _qs.default.stringify(_objectSpread({}, _qs.default.parse(sourceUrl.query), newQuery), {
    strictNullHandling: true
  });

  return _url.default.format(_objectSpread({}, sourceUrl, {
    search: query
  }));
};

const getQuery = (pageOpt, page) => {
  const out = {};
  if (pageOpt.pageParam) out[pageOpt.pageParam] = page;
  if (pageOpt.limitParam && pageOpt.limit) out[pageOpt.limitParam] = pageOpt.limit;
  if (pageOpt.offsetParam) out[pageOpt.offsetParam] = page * pageOpt.limit;
  return out;
};

const fetchStream = (source, opt = {}, raw = false) => {
  const concurrent = opt.concurrency != null ? opt.concurrency : 10;

  if (Array.isArray(source)) {
    // zips eat memory, do not run more than one at a time
    const containsZips = source.some(i => i.parserOptions && i.parserOptions.zip);
    if (containsZips && opt.debug) opt.debug('Detected zip, running with concurrency=1');
    return (0, _multi.default)({
      concurrent: containsZips ? 1 : concurrent,
      inputs: source.map(i => fetchStream.bind(null, i, opt, true)),
      onError: opt.onError || defaultErrorHandler
    });
  } // validate params


  if (!source) throw new Error('Missing source argument');

  const src = _objectSpread({}, source); // clone


  if (!src.url || typeof src.url !== 'string') throw new Error('Invalid source url');

  if (typeof src.parser === 'string') {
    if (src.parserOptions && typeof src.parserOptions !== 'object') throw new Error('Invalid source parserOptions');
    src.parser = (0, _parse.default)(src.parser, src.parserOptions); // JSON shorthand
  }

  if (typeof src.parser !== 'function') throw new Error('Invalid parser function');
  if (src.headers && typeof src.headers !== 'object') throw new Error('Invalid headers object');
  if (src.oauth && typeof src.oauth !== 'object') throw new Error('Invalid oauth object');
  if (src.oauth && typeof src.oauth.grant !== 'object') throw new Error('Invalid oauth.grant object'); // actual work time

  const runStream = accessToken => {
    if (src.pagination) {
      const startPage = src.pagination.startPage || 0;
      return (0, _page.default)(startPage, currentPage => {
        const newURL = mergeURL(src.url, getQuery(src.pagination, currentPage));
        if (opt.debug) opt.debug('Fetching next page', newURL);
        return (0, _fetchWithParser.default)({
          url: newURL,
          parser: src.parser,
          source
        }, getOptions(src, opt, accessToken));
      }, {
        concurrent,
        onError: defaultErrorHandler
      }).pause();
    }

    if (opt.debug) opt.debug('Fetching', src.url);
    return (0, _fetchWithParser.default)({
      url: src.url,
      parser: src.parser,
      source
    }, getOptions(src, opt, accessToken));
  };

  let outStream;

  if (src.oauth) {
    if (opt.debug) opt.debug('Fetching OAuth token'); // if oauth enabled, grab a token first and then set the pipeline

    outStream = _pumpify.default.obj();
    (0, _oauth.getToken)(src.oauth).then(accessToken => {
      if (opt.debug) opt.debug('Got OAuth token', accessToken);
      const realStream = runStream(accessToken);
      outStream.abort = realStream.abort;
      outStream.setPipeline(realStream, _through.default.obj());
    }).catch(err => {
      if (opt.debug) opt.debug('Failed to get OAuth token', err);
      outStream.emit('error', err);
      (0, _hardClose.default)(outStream);
    });
  } else {
    outStream = runStream();
  }

  if (raw) return outStream; // child of an array of sources, error mgmt handled already

  return (0, _multi.default)({
    concurrent,
    inputs: [outStream],
    onError: opt.onError || defaultErrorHandler
  });
};

var _default = fetchStream;
exports.default = _default;
module.exports = exports.default;
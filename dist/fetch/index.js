'use strict';

exports.__esModule = true;

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _qs = require('qs');

var _qs2 = _interopRequireDefault(_qs);

var _pumpify = require('pumpify');

var _pumpify2 = _interopRequireDefault(_pumpify);

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _oauth = require('./oauth');

var _fetchWithParser = require('./fetchWithParser');

var _fetchWithParser2 = _interopRequireDefault(_fetchWithParser);

var _multi = require('./multi');

var _multi2 = _interopRequireDefault(_multi);

var _page = require('./page');

var _page2 = _interopRequireDefault(_page);

var _hardClose = require('../hardClose');

var _hardClose2 = _interopRequireDefault(_hardClose);

var _parse = require('../parse');

var _parse2 = _interopRequireDefault(_parse);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const getOptions = (src, opt, accessToken) => ({
  accessToken,
  fetchURL: opt.fetchURL,
  debug: opt.debug,
  timeout: opt.timeout,
  attempts: opt.attempts,
  headers: src.headers,
  context: opt.context
});

// default behavior is to fail on first error
const defaultErrorHandler = ({ error, output }) => {
  output.emit('error', error);
};

const mergeURL = (origUrl, newQuery) => {
  const sourceUrl = _url2.default.parse(origUrl);
  const query = _qs2.default.stringify(Object.assign({}, _qs2.default.parse(sourceUrl.query), newQuery), { strictNullHandling: true });
  return _url2.default.format(Object.assign({}, sourceUrl, { search: query }));
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
    return (0, _multi2.default)({
      concurrent: containsZips ? 1 : concurrent,
      inputs: source.map(i => fetchStream.bind(null, i, opt, true)),
      onError: opt.onError || defaultErrorHandler
    });
  }

  // validate params
  if (!source) throw new Error('Missing source argument');
  const src = Object.assign({}, source); // clone
  if (!src.url || typeof src.url !== 'string') throw new Error('Invalid source url');
  if (typeof src.parser === 'string') {
    if (src.parserOptions && typeof src.parserOptions !== 'object') throw new Error('Invalid source parserOptions');
    src.parser = (0, _parse2.default)(src.parser, src.parserOptions); // JSON shorthand
  }
  if (typeof src.parser !== 'function') throw new Error('Invalid parser function');
  if (src.headers && typeof src.headers !== 'object') throw new Error('Invalid headers object');
  if (src.oauth && typeof src.oauth !== 'object') throw new Error('Invalid oauth object');
  if (src.oauth && typeof src.oauth.grant !== 'object') throw new Error('Invalid oauth.grant object');

  // actual work time
  const runStream = accessToken => {
    if (src.pagination) {
      const startPage = src.pagination.startPage || 0;
      return (0, _page2.default)(startPage, currentPage => {
        const newURL = mergeURL(src.url, getQuery(src.pagination, currentPage));
        if (opt.debug) opt.debug('Fetching next page', newURL);
        return (0, _fetchWithParser2.default)({ url: newURL, parser: src.parser, source }, getOptions(src, opt, accessToken));
      }, {
        concurrent,
        onError: defaultErrorHandler
      }).pause();
    }
    if (opt.debug) opt.debug('Fetching', src.url);
    return (0, _fetchWithParser2.default)({ url: src.url, parser: src.parser, source }, getOptions(src, opt, accessToken));
  };

  let outStream;
  if (src.oauth) {
    if (opt.debug) opt.debug('Fetching OAuth token');
    // if oauth enabled, grab a token first and then set the pipeline
    outStream = _pumpify2.default.obj();
    (0, _oauth.getToken)(src.oauth).then(accessToken => {
      if (opt.debug) opt.debug('Got OAuth token', accessToken);
      const realStream = runStream(accessToken);
      outStream.abort = realStream.abort;
      outStream.setPipeline(realStream, _through2.default.obj());
    }).catch(err => {
      if (opt.debug) opt.debug('Failed to get OAuth token', err);
      outStream.emit('error', err);
      (0, _hardClose2.default)(outStream);
    });
  } else {
    outStream = runStream();
  }

  if (raw) return outStream; // child of an array of sources, error mgmt handled already
  return (0, _multi2.default)({
    concurrent,
    inputs: [outStream],
    onError: opt.onError || defaultErrorHandler
  });
};

exports.default = fetchStream;
module.exports = exports.default;
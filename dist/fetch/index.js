"use strict";

exports.__esModule = true;
exports.default = void 0;

var _pumpify = _interopRequireDefault(require("pumpify"));

var _pSeries = _interopRequireDefault(require("p-series"));

var _readableStream = require("readable-stream");

var _duplexify = _interopRequireDefault(require("duplexify"));

var _url = _interopRequireDefault(require("url"));

var _fetchURL = _interopRequireDefault(require("./fetchURL"));

var _oauth = require("./oauth");

var _fetchWithParser = _interopRequireDefault(require("./fetchWithParser"));

var _sandbox = _interopRequireDefault(require("../sandbox"));

var _mergeURL = _interopRequireDefault(require("../mergeURL"));

var _hardClose = _interopRequireDefault(require("../hardClose"));

var _parse = _interopRequireDefault(require("../parse"));

var _mapStream = _interopRequireDefault(require("../streams/mapStream"));

var _multiStream = _interopRequireDefault(require("../streams/multiStream"));

var _pageStream = _interopRequireDefault(require("../streams/pageStream"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const defaultConcurrency = 8;

const getFetchOptions = (source, opt, setupResult = {}) => ({
  fetchURL: opt.fetchURL,
  debug: opt.debug,
  timeout: opt.timeout,
  connectTimeout: opt.connectTimeout,
  attempts: opt.attempts,
  context: opt.context,
  headers: { ...(source.headers || {}),
    ...(setupResult.headers || {})
  },
  query: { ...(source.query || {}),
    ...(setupResult.query || {})
  },
  accessToken: setupResult.accessToken
}); // default behavior is to fail on first error


const defaultErrorHandler = ({
  error,
  output
}) => {
  output.emit('error', error);
};

const getPageQuery = (pageOpt, page) => {
  const out = {};
  if (pageOpt.pageParam) out[pageOpt.pageParam] = page;
  if (pageOpt.limitParam && pageOpt.limit) out[pageOpt.limitParam] = pageOpt.limit;
  if (pageOpt.offsetParam) out[pageOpt.offsetParam] = page * pageOpt.limit;
  return out;
};

async function _ref(ourSource) {
  return {
    accessToken: await (0, _oauth.getToken)(ourSource.oauth)
  };
}

const setupContext = (source, opt, getStream) => {
  const preRun = [];

  if (source.oauth) {
    preRun.push(_ref);
  }

  if (source.setup) {
    if (typeof source.setup === 'string') {
      source.setup = (0, _sandbox.default)(source.setup, opt.setup);
    }

    const setupFn = source.setup?.default || source.setup;
    if (typeof setupFn !== 'function') throw new Error('Invalid setup function!');
    preRun.push(setupFn);
  }

  if (preRun.length === 0) return getStream(source); // nothing to set up, go to next step

  const preRunBound = preRun.map(fn => fn.bind(null, source, {
    context: opt.context
  }));

  const out = _pumpify.default.obj();

  (0, _pSeries.default)(preRunBound).then(results => {
    const setupResult = Object.assign({}, ...results);
    const realStream = getStream(setupResult);
    out.url = realStream.url;
    out.abort = realStream.abort;
    out.setPipeline(realStream, new _readableStream.PassThrough({
      objectMode: true
    }));
  }).catch(err => {
    out.emit('error', err);
    (0, _hardClose.default)(out);
  });
  return out;
};

const createParser = (baseParser, nextPageParser) => {
  if (!nextPageParser) return baseParser;
  return () => {
    const base = baseParser();
    const nextPage = nextPageParser();
    const read = new _readableStream.PassThrough();
    const write = new _readableStream.PassThrough({
      objectMode: true
    });

    const out = _duplexify.default.obj(read, write);

    const fail = err => err && out.emit('error', err); // plumbing, read goes to both parsers
    // we relay data events from the base parser
    // and a nextPage event from that parser


    (0, _readableStream.pipeline)(read, base, fail);
    (0, _readableStream.pipeline)(read, nextPage, _mapStream.default.obj((nextPage, _, cb) => {
      out.emit('nextPage', nextPage);
      cb();
    }), fail);
    (0, _readableStream.pipeline)(base, write, fail);
    return out;
  };
};

function _ref2(i) {
  return i.parserOptions && i.parserOptions.zip;
}

const fetchStream = (source, opt = {}, raw = false) => {
  const concurrent = opt.concurrency != null ? opt.concurrency : defaultConcurrency;

  function _ref3(i) {
    return fetchStream.bind(null, i, opt, true);
  }

  if (Array.isArray(source)) {
    // zips eat memory, do not run more than one at a time
    const containsZips = source.some(_ref2);
    if (containsZips && opt.debug) opt.debug('Detected zip, running with concurrency=1');
    return (0, _multiStream.default)({
      concurrent: containsZips ? 1 : concurrent,
      inputs: source.map(_ref3),
      onError: opt.onError || defaultErrorHandler
    });
  } // validate params


  if (!source) throw new Error('Missing source argument');
  if (!source.url || typeof source.url !== 'string') throw new Error('Invalid source url');

  if (typeof source.parser === 'string') {
    if (source.parserOptions && typeof source.parserOptions !== 'object') throw new Error('Invalid source parserOptions');
  } else if (typeof source.parser !== 'function') {
    throw new Error('Invalid parser function');
  }

  if (source.headers && typeof source.headers !== 'object') throw new Error('Invalid headers object');
  if (source.oauth && typeof source.oauth !== 'object') throw new Error('Invalid oauth object');
  if (source.oauth && typeof source.oauth.grant !== 'object') throw new Error('Invalid oauth.grant object');

  const getStream = setupResult => {
    const baseParser = typeof source.parser === 'string' ? (0, _parse.default)(source.parser, source.parserOptions) // JSON shorthand
    : source.parser;

    if (!source.pagination) {
      return (0, _fetchWithParser.default)({
        url: source.url,
        parser: baseParser,
        source
      }, getFetchOptions(source, opt, setupResult));
    } // if nextPageSelector is present, multiplex the parsers


    if (source.pagination.nextPageSelector && typeof source.parser !== 'string') {
      throw new Error(`pagination.nextPageSelector can't be used with custom parser functions!`);
    }

    const nextPageParser = source.pagination.nextPageSelector ? (0, _parse.default)(source.parser, { ...source.parserOptions,
      selector: source.pagination.nextPageSelector
    }) : null;
    const parser = createParser(baseParser, nextPageParser);
    return (0, _pageStream.default)({
      startPage: source.pagination.startPage,
      waitForNextPage: !!nextPageParser,
      fetchNextPage: ({
        nextPage,
        nextPageURL
      }) => {
        const newURL = nextPageURL ? _url.default.resolve(source.url, nextPageURL) : (0, _mergeURL.default)(source.url, getPageQuery(source.pagination, nextPage));
        return (0, _fetchWithParser.default)({
          url: newURL,
          parser,
          source
        }, getFetchOptions(source, opt, setupResult));
      },
      concurrent,
      onError: defaultErrorHandler
    });
  }; // actual work time


  const outStream = setupContext(source, opt, getStream);
  if (raw) return outStream; // child of an array of sources, error mgmt handled already

  return (0, _multiStream.default)({
    concurrent,
    inputs: [outStream],
    onError: opt.onError || defaultErrorHandler
  });
};

fetchStream.fetchURL = _fetchURL.default;
fetchStream.getOAuthToken = _oauth.getToken;
var _default = fetchStream;
exports.default = _default;
module.exports = exports.default;
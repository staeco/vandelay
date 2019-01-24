'use strict';

exports.__esModule = true;

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _qs = require('qs');

var _qs2 = _interopRequireDefault(_qs);

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _pumpify = require('pumpify');

var _pumpify2 = _interopRequireDefault(_pumpify);

var _multi = require('./multi');

var _multi2 = _interopRequireDefault(_multi);

var _page = require('./page');

var _page2 = _interopRequireDefault(_page);

var _fetchURL = require('./fetchURL');

var _fetchURL2 = _interopRequireDefault(_fetchURL);

var _parse = require('../parse');

var _parse2 = _interopRequireDefault(_parse);

var _hardClose = require('../hardClose');

var _hardClose2 = _interopRequireDefault(_hardClose);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const getOptions = (src, opt) => ({
  log: opt.log,
  timeout: opt.timeout,
  attempts: opt.attempts,
  headers: src.headers
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
  const concurrent = opt.concurrency != null ? opt.concurrency : 50;
  if (Array.isArray(source)) {
    return (0, _multi2.default)({
      concurrent,
      inputs: source.map(i => fetchStream.bind(null, i, opt, true)),
      onError: opt.onError || defaultErrorHandler
    });
  }

  const fetchURL = opt.fetchURL || _fetchURL2.default;

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

  // URL + Parser
  const fetch = (url, opt) => {
    // attaches some meta to the object for the transform fn to use
    let rows = -1;
    const map = function (row, _, cb) {
      // create the meta and put it on objects passing through
      if (row && typeof row === 'object') {
        row.___meta = {
          row: ++rows,
          url,
          source

          // json header info from the parser
        };if (row.___header) {
          row.___meta.header = row.___header;
          delete row.___header;
        }
      }
      cb(null, row);
    };

    let req = fetchURL(url, opt);
    if (opt.onFetch) opt.onFetch(url);
    const out = _pumpify2.default.ctor({
      autoDestroy: false,
      destroy: false,
      objectMode: true
    })(req, src.parser(), (0, _through2.default)({ objectMode: true }, map));
    out.raw = req.req;
    out.abort = () => {
      req.abort();
      (0, _hardClose2.default)(out);
    };
    out.on('error', err => {
      err.source = source;
      err.url = url;
    });
    return out;
  };

  let outStream;
  if (src.pagination) {
    const startPage = src.pagination.startPage || 0;
    outStream = (0, _page2.default)(startPage, currentPage => {
      const newURL = mergeURL(src.url, getQuery(src.pagination, currentPage));
      return fetch(newURL, getOptions(src, opt));
    }, { concurrent }).pause();
  } else {
    outStream = fetch(src.url, getOptions(src, opt));
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
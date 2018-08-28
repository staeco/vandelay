'use strict';

exports.__esModule = true;

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _qs = require('qs');

var _qs2 = _interopRequireDefault(_qs);

var _continueStream = require('continue-stream');

var _continueStream2 = _interopRequireDefault(_continueStream);

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _pumpify = require('pumpify');

var _pumpify2 = _interopRequireDefault(_pumpify);

var _multi = require('./multi');

var _multi2 = _interopRequireDefault(_multi);

var _fetchURL = require('./fetchURL');

var _fetchURL2 = _interopRequireDefault(_fetchURL);

var _parse = require('../parse');

var _parse2 = _interopRequireDefault(_parse);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// default behavior is to fail on first error
const defaultErrorHandler = ({ error, output }) => {
  output.emit('error', error);
};

const mergeURL = (origUrl, newQuery) => {
  const sourceUrl = _url2.default.parse(origUrl);
  const query = _qs2.default.stringify(Object.assign({}, _qs2.default.parse(sourceUrl.query), newQuery));
  return _url2.default.format(Object.assign({}, sourceUrl, { search: query }));
};

const getQuery = (opt, page) => {
  const out = {};
  if (opt.pageParam) out[opt.pageParam] = page;
  if (opt.limitParam && opt.limit) out[opt.limitParam] = opt.limit;
  if (opt.offsetParam) out[opt.offsetParam] = page * opt.limit;
  return out;
};

const fetchStream = (source, opt = {}) => {
  if (Array.isArray(source)) {
    return (0, _multi2.default)({
      inputs: source.map(i => fetchStream(i, opt)),
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
  if (opt.modifyRequest && typeof opt.modifyRequest !== 'function') throw new Error('Invalid modifyRequest function');

  // URL + Parser
  const fetch = url => {
    // attaches some meta to the object for the transform fn to use
    let rows = -1;
    const map = function (row, _, cb) {
      // create the meta and put it on objects passing through
      if (typeof row === 'object') {
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

    let req = fetchURL(url);
    if (opt.modifyRequest) req = opt.modifyRequest(src, req);
    const out = _pumpify2.default.obj(req, src.parser(), _through2.default.obj(map));
    out.abort = () => {
      req.abort();
      out.end();
    };
    out.on('error', err => {
      err.source = source;
      err.url = url;
    });
    return out;
  };

  let outStream;
  if (src.pagination) {
    let page = src.pagination.startPage || 0;
    let pageDatums; // gets reset on each page to 0
    let lastFetch;
    let destroyed = false;
    outStream = _continueStream2.default.obj(cb => {
      if (destroyed || pageDatums === 0) return cb();
      pageDatums = 0;
      const newURL = mergeURL(src.url, getQuery(src.pagination, page));
      lastFetch = fetch(newURL);
      page++;
      cb(null, lastFetch);
    }).on('data', () => ++pageDatums);
    outStream.abort = () => {
      destroyed = true;
      outStream.destroy();
      lastFetch && lastFetch.abort();
    };
  } else {
    outStream = fetch(src.url);
  }

  return (0, _multi2.default)({
    inputs: [outStream],
    onError: opt.onError || defaultErrorHandler
  });
};

exports.default = fetchStream;
module.exports = exports['default'];
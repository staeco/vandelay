'use strict';

exports.__esModule = true;

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _qs = require('qs');

var _qs2 = _interopRequireDefault(_qs);

var _continueStream = require('continue-stream');

var _continueStream2 = _interopRequireDefault(_continueStream);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _pump = require('pump');

var _pump2 = _interopRequireDefault(_pump);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

const fetchURL = url => _superagent2.default.get(url).buffer(false).redirects(10).retry(10);

exports.default = (source, opt = {}) => {
  // custom stream source
  if (typeof source === 'function') return source();

  // validate params
  if (!source) throw new Error('Missing source argument');
  if (typeof source.url !== 'string') throw new Error('Invalid source url');
  if (typeof source.parser !== 'function') throw new Error('Invalid parser function');
  if (opt.modifyRequest && typeof opt.modifyRequest !== 'function') throw new Error('Invalid modifyRequest function');

  // attaches some meta to the object for the transform fn to use
  let rows = -1;
  const map = function (row, _, cb) {
    if (!row || typeof row !== 'object') throw new Error(`Invalid row - ${row}`);
    row.___meta = {
      row: ++rows,
      source,
      header: row.___header // internal attr, json header info from the parser
    };
    delete row.___header;
    cb(null, row);
  };

  // URL + Parser
  const fetch = url => {
    let req = fetchURL(url);
    if (opt.modifyRequest) req = opt.modifyRequest(source, req);
    return (0, _pump2.default)(req, source.parser(), _through2.default.obj(map));
  };

  if (source.pagination) {
    let page = source.pagination.startPage || 0;
    let pageDatums; // gets reset on each page to 0
    return _continueStream2.default.obj(cb => {
      if (pageDatums === 0) return cb();
      pageDatums = 0;
      const newURL = mergeURL(source.url, getQuery(source.pagination, page));
      page++;
      cb(null, fetch(newURL));
    }).on('data', () => ++pageDatums);
  }

  return fetch(source.url);
};

module.exports = exports['default'];
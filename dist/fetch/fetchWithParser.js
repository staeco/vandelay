'use strict';

exports.__esModule = true;

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _pumpify = require('pumpify');

var _pumpify2 = _interopRequireDefault(_pumpify);

var _lodash = require('lodash.pickby');

var _lodash2 = _interopRequireDefault(_lodash);

var _fetchURL = require('./fetchURL');

var _fetchURL2 = _interopRequireDefault(_fetchURL);

var _hardClose = require('../hardClose');

var _hardClose2 = _interopRequireDefault(_hardClose);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const notNull = v => v != null;

exports.default = ({ url, parser, source }, opt) => {
  const fetchURL = opt.fetchURL || _fetchURL2.default;

  // attaches some meta to the object for the transform fn to use
  let rows = -1;
  const req = fetchURL(url, opt);
  if (opt.onFetch) opt.onFetch(req.url);
  const map = (row, _, cb) => {
    // create the meta and put it on objects passing through
    if (row && typeof row === 'object') {
      row.___meta = (0, _lodash2.default)({
        row: ++rows,
        url: req.url,
        accessToken: opt && opt.accessToken,
        source
      }, notNull);

      // json header info from the parser
      if (row.___header) {
        row.___meta.header = row.___header;
        delete row.___header;
      }
    }
    cb(null, row);
  };

  const out = _pumpify2.default.ctor({
    autoDestroy: false,
    destroy: false,
    objectMode: true
  })(req, parser(), (0, _through2.default)({ objectMode: true }, map));
  out.raw = req.req;
  out.url = req.url;
  out.abort = () => {
    req.abort();
    (0, _hardClose2.default)(out);
  };
  out.on('error', err => {
    err.source = source;
    err.url = req.url;
  });
  return out;
};

module.exports = exports.default;
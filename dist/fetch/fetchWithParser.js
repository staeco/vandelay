"use strict";

exports.__esModule = true;
exports.default = void 0;

var _stream = require("stream");

var _lodash = require("lodash");

var _mapStream = _interopRequireDefault(require("../streams/mapStream"));

var _fetchURL = _interopRequireDefault(require("./fetchURL"));

var _hardClose = _interopRequireDefault(require("../hardClose"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const notNull = v => v != null;

var _default = ({
  url,
  parser,
  source
}, opt) => {
  const fetchURL = opt.fetchURL || _fetchURL.default; // attaches some meta to the object for the transform fn to use

  let rows = -1;
  const req = fetchURL(url, opt);
  if (opt.onFetch) opt.onFetch(req.url);

  const map = (row, cb) => {
    // create the meta and put it on objects passing through
    if (row && typeof row === 'object') {
      row.___meta = (0, _lodash.pickBy)({
        row: ++rows,
        url: req.url,
        accessToken: opt?.accessToken,
        context: opt?.context,
        source
      }, notNull); // json header info from the parser

      if (row.___header) {
        row.___meta.header = row.___header;
        delete row.___header;
      }
    }

    cb(null, row);
  };

  const parse = parser();
  const out = (0, _stream.pipeline)(req, parse, _mapStream.default.obj(map), err => {
    if (err) {
      err.source = source;
      err.url = req.url;
      out.emit('error', err);
    }
  }); // forward some props and events

  parse.once('nextPage', (...a) => out.emit('nextPage', ...a));
  out.req = req.req;
  out.url = req.url;

  out.abort = () => {
    req.abort();
    (0, _hardClose.default)(out);
  };

  return out;
};

exports.default = _default;
module.exports = exports.default;
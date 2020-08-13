"use strict";

exports.__esModule = true;
exports.default = void 0;

var _through = _interopRequireDefault(require("through2"));

var _pumpify = _interopRequireDefault(require("pumpify"));

var _lodash = require("lodash");

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

  const map = (row, _, cb) => {
    // create the meta and put it on objects passing through
    if (row && typeof row === 'object') {
      row.___meta = (0, _lodash.pickBy)({
        row: ++rows,
        url: req.url,
        accessToken: opt === null || opt === void 0 ? void 0 : opt.accessToken,
        context: opt === null || opt === void 0 ? void 0 : opt.context,
        source
      }, notNull); // json header info from the parser

      if (row.___header) {
        row.___meta.header = row.___header;
        delete row.___header;
      }
    }

    cb(null, row);
  };

  const out = _pumpify.default.ctor({
    autoDestroy: false,
    destroy: false,
    objectMode: true
  })(req, parser(), (0, _through.default)({
    objectMode: true
  }, map));

  out.req = req.req;
  out.url = req.url;

  out.abort = () => {
    req.abort();
    (0, _hardClose.default)(out);
  };

  out.on('error', err => {
    err.source = source;
    err.url = req.url;
  });
  return out;
};

exports.default = _default;
module.exports = exports.default;
'use strict';

exports.__esModule = true;
exports.gtfs = exports.gtfsrt = exports.shp = exports.xml = exports.json = exports.excel = exports.csv = undefined;

var _csvParser = require('csv-parser');

var _csvParser2 = _interopRequireDefault(_csvParser);

var _exceljsTransformStream = require('exceljs-transform-stream');

var _exceljsTransformStream2 = _interopRequireDefault(_exceljsTransformStream);

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _shp2json = require('shp2json');

var _shp2json2 = _interopRequireDefault(_shp2json);

var _duplexer = require('duplexer2');

var _duplexer2 = _interopRequireDefault(_duplexer);

var _pumpify = require('pumpify');

var _pumpify2 = _interopRequireDefault(_pumpify);

var _pump = require('pump');

var _pump2 = _interopRequireDefault(_pump);

var _JSONStream = require('JSONStream');

var _JSONStream2 = _interopRequireDefault(_JSONStream);

var _gtfsStream = require('gtfs-stream');

var _gtfsStream2 = _interopRequireDefault(_gtfsStream);

var _camelcase = require('camelcase');

var _camelcase2 = _interopRequireDefault(_camelcase);

var _unzip = require('./unzip');

var _unzip2 = _interopRequireDefault(_unzip);

var _xml2json = require('./xml2json');

var _xml2json2 = _interopRequireDefault(_xml2json);

var _autoParse = require('./autoParse');

var _autoParse2 = _interopRequireDefault(_autoParse);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// these formatters receive one argument, "data source" object
// and return a stream that maps strings to items
const csv = exports.csv = opt => {
  if (opt.camelcase && typeof opt.camelcase !== 'boolean') throw new Error('Invalid camelcase option');
  if (opt.autoParse && typeof opt.autoParse !== 'boolean') throw new Error('Invalid autoParse option');
  if (opt.zip) return (0, _unzip2.default)(csv.bind(undefined, Object.assign({}, opt, { zip: undefined })), /\.csv$/);

  const head = (0, _csvParser2.default)({
    mapHeaders: ({ header }) => opt.camelcase ? (0, _camelcase2.default)(header) : header.trim(),
    mapValues: ({ value }) => opt.autoParse ? (0, _autoParse2.default)(value) : value
  });
  // convert into normal objects
  const tail = _through2.default.obj((row, _, cb) => {
    delete row.headers;
    cb(null, Object.assign({}, row));
  });
  return _pumpify2.default.obj(head, tail);
};
const excel = exports.excel = opt => {
  if (opt.camelcase && typeof opt.camelcase !== 'boolean') throw new Error('Invalid camelcase option');
  if (opt.autoParse && typeof opt.autoParse !== 'boolean') throw new Error('Invalid autoParse option');
  if (opt.zip) return (0, _unzip2.default)(excel.bind(undefined, Object.assign({}, opt, { zip: undefined })), /\.xlsx$/);
  return (0, _exceljsTransformStream2.default)({
    mapHeaders: v => opt.camelcase ? (0, _camelcase2.default)(v) : v.trim(),
    mapValues: v => opt.autoParse ? (0, _autoParse2.default)(v) : v
  });
};
const json = exports.json = opt => {
  if (Array.isArray(opt.selector)) {
    const inStream = (0, _through2.default)();
    const outStream = _through2.default.obj();
    opt.selector.forEach(selector => (0, _pump2.default)(inStream, json(Object.assign({}, opt, { selector })), outStream));
    return (0, _duplexer2.default)({ objectMode: true }, inStream, outStream);
  }

  if (typeof opt.selector !== 'string') throw new Error('Missing selector for JSON parser!');
  if (opt.zip) return (0, _unzip2.default)(json.bind(undefined, Object.assign({}, opt, { zip: undefined })), /\.json$/);
  const head = _JSONStream2.default.parse(opt.selector);
  let header;
  head.once('header', data => header = data);
  const tail = _through2.default.obj((row, _, cb) => {
    if (header && typeof row === 'object') row.___header = header; // internal attr, json header info for fetch stream
    cb(null, row);
  });
  return _pumpify2.default.obj(head, tail);
};

const xml = exports.xml = opt => {
  if (opt.camelcase && typeof opt.camelcase !== 'boolean') throw new Error('Invalid camelcase option');
  if (opt.autoParse && typeof opt.autoParse !== 'boolean') throw new Error('Invalid autoParse option');
  if (opt.xml) return (0, _unzip2.default)(xml.bind(undefined, Object.assign({}, opt, { zip: undefined })), /\.xml$/);
  return _pumpify2.default.obj((0, _xml2json2.default)(opt), json(opt));
};

const shp = exports.shp = () => {
  const head = (0, _through2.default)();
  const mid = (0, _shp2json2.default)(head);
  const tail = _JSONStream2.default.parse('features.*');
  return (0, _duplexer2.default)({ objectMode: true }, head, (0, _pump2.default)(mid, tail));
};

const gtfsrt = exports.gtfsrt = () => _gtfsStream2.default.rt();
const gtfs = exports.gtfs = () => (0, _gtfsStream2.default)();
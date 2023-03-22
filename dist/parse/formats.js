"use strict";

exports.__esModule = true;
exports.xml = exports.tsv = exports.shp = exports.ndjson = exports.kmz = exports.kml = exports.json = exports.html = exports.gtfsrt = exports.gtfs = exports.gpx = exports.gdb = exports.excel = exports.csv = void 0;
var _csvParser = _interopRequireDefault(require("csv-parser"));
var _xlsxParseStream = _interopRequireDefault(require("xlsx-parse-stream"));
var _verrazzano = require("verrazzano");
var _duplexify = _interopRequireDefault(require("duplexify"));
var _pumpify = _interopRequireDefault(require("pumpify"));
var _stream = require("stream");
var _jsonstreamNext = _interopRequireDefault(require("jsonstream-next"));
var _gtfsStream = _interopRequireDefault(require("gtfs-stream"));
var _lodash = require("lodash");
var _ndjson = require("ndjson");
var _mapStream = _interopRequireDefault(require("../streams/mapStream"));
var _unzip = _interopRequireDefault(require("./unzip"));
var _xml2json = _interopRequireDefault(require("./xml2json"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _ref({
  header
}) {
  return header?.trim();
}
function _ref2(row, cb) {
  cb(null, (0, _lodash.omit)(row, 'headers'));
}
// these formatters receive one argument, "data source" object
// and return a stream that maps strings to items
const csv = opt => {
  if (opt.zip) return (0, _unzip.default)(csv.bind(void 0, {
    ...opt,
    zip: undefined
  }), /\.csv$/);
  const head = (0, _csvParser.default)({
    mapHeaders: _ref,
    skipComments: true
  });
  // convert into normal objects
  const tail = _mapStream.default.obj(_ref2);
  return _pumpify.default.obj(head, tail);
};
exports.csv = csv;
function _ref3({
  header
}) {
  return header?.trim();
}
function _ref4(row, cb) {
  cb(null, (0, _lodash.omit)(row, 'headers'));
}
const tsv = opt => {
  if (opt.zip) return (0, _unzip.default)(csv.bind(void 0, {
    ...opt,
    zip: undefined
  }), /\.tsv$/);
  const head = (0, _csvParser.default)({
    separator: '\t',
    mapHeaders: _ref3,
    skipComments: true
  });
  // convert into normal objects
  const tail = _mapStream.default.obj(_ref4);
  return _pumpify.default.obj(head, tail);
};
exports.tsv = tsv;
function _ref5(header) {
  return header?.trim();
}
const excel = opt => {
  if (opt.zip) return (0, _unzip.default)(excel.bind(void 0, {
    ...opt,
    zip: undefined
  }), /\.xlsx$/);
  return (0, _xlsxParseStream.default)({
    ...opt,
    mapHeaders: _ref5
  });
};
exports.excel = excel;
const ndjson = opt => {
  if (opt.zip) return (0, _unzip.default)(ndjson.bind(void 0, {
    ...opt,
    zip: undefined
  }), /\.ndjson$/);
  return (0, _ndjson.parse)();
};
exports.ndjson = ndjson;
const json = opt => {
  if (Array.isArray(opt.selector)) {
    const inStream = new _stream.PassThrough();
    const outStream = _mapStream.default.obj();
    function _ref6(err) {
      if (err) outStream.emit('error', err);
    }
    opt.selector.forEach(selector => (0, _stream.pipeline)(inStream, json({
      ...opt,
      selector
    }), outStream, _ref6));
    return _duplexify.default.obj(inStream, outStream);
  }
  if (typeof opt.selector !== 'string') throw new Error('Missing selector for JSON parser!');
  if (opt.zip) return (0, _unzip.default)(json.bind(void 0, {
    ...opt,
    zip: undefined
  }), /\.json$/);
  const head = _jsonstreamNext.default.parse(opt.selector);
  let header;
  head.once('header', data => header = data);
  const tail = _mapStream.default.obj((row, cb) => {
    if (header && typeof row === 'object') row.___header = header; // internal attr, json header info for fetch stream
    cb(null, row);
  });
  return _pumpify.default.obj(head, tail);
};
exports.json = json;
const xml = opt => {
  if (opt.zip) return (0, _unzip.default)(xml.bind(void 0, {
    ...opt,
    zip: undefined
  }), /\.xml$/);
  return _pumpify.default.obj((0, _xml2json.default)(opt), json(opt));
};
exports.xml = xml;
const html = opt => {
  if (opt.zip) return (0, _unzip.default)(html.bind(void 0, {
    ...opt,
    zip: undefined
  }), /\.html$/);
  return _pumpify.default.obj((0, _xml2json.default)({
    ...opt,
    strict: false
  }), json(opt));
};
exports.html = html;
const gdb = opts => _verrazzano.from.bind(null, 'gdb')(opts);
exports.gdb = gdb;
const gpx = opts => _verrazzano.from.bind(null, 'gpx')(opts);
exports.gpx = gpx;
const kml = opts => _verrazzano.from.bind(null, 'kml')(opts);
exports.kml = kml;
const kmz = opts => _verrazzano.from.bind(null, 'kmz')(opts);
exports.kmz = kmz;
const shp = opts => _verrazzano.from.bind(null, 'shp')(opts);
exports.shp = shp;
const gtfsrt = () => _gtfsStream.default.rt();
exports.gtfsrt = gtfsrt;
const gtfs = () => _gtfsStream.default.enhanced();
exports.gtfs = gtfs;
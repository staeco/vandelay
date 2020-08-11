"use strict";

exports.__esModule = true;
exports.gtfs = exports.gtfsrt = exports.shp = exports.kmz = exports.kml = exports.gpx = exports.gdb = exports.html = exports.xml = exports.json = exports.ndjson = exports.excel = exports.tsv = exports.csv = void 0;

var _csvParser = _interopRequireDefault(require("csv-parser"));

var _exceljsTransformStream = _interopRequireDefault(require("exceljs-transform-stream"));

var _through = _interopRequireDefault(require("through2"));

var _verrazzano = require("verrazzano");

var _duplexify = _interopRequireDefault(require("duplexify"));

var _pumpify = _interopRequireDefault(require("pumpify"));

var _stream = require("stream");

var _jsonstreamNext = _interopRequireDefault(require("jsonstream-next"));

var _gtfsStream = _interopRequireDefault(require("gtfs-stream"));

var _lodash = require("lodash");

var _ndjsonNext = require("ndjson-next");

var _unzip = _interopRequireDefault(require("./unzip"));

var _xml2json = _interopRequireDefault(require("./xml2json"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// these formatters receive one argument, "data source" object
// and return a stream that maps strings to items
const csv = opt => {
  if (opt.zip) return (0, _unzip.default)(csv.bind(void 0, _objectSpread(_objectSpread({}, opt), {}, {
    zip: undefined
  })), /\.csv$/);
  const head = (0, _csvParser.default)({
    mapHeaders: ({
      header
    }) => header.trim()
  }); // convert into normal objects

  const tail = _through.default.obj((row, _, cb) => {
    cb(null, (0, _lodash.omit)(row, 'headers'));
  });

  return _pumpify.default.obj(head, tail);
};

exports.csv = csv;

const tsv = opt => {
  if (opt.zip) return (0, _unzip.default)(csv.bind(void 0, _objectSpread(_objectSpread({}, opt), {}, {
    zip: undefined
  })), /\.tsv$/);
  const head = (0, _csvParser.default)({
    separator: '\t',
    mapHeaders: ({
      header
    }) => header.trim()
  }); // convert into normal objects

  const tail = _through.default.obj((row, _, cb) => {
    cb(null, (0, _lodash.omit)(row, 'headers'));
  });

  return _pumpify.default.obj(head, tail);
};

exports.tsv = tsv;

const excel = opt => {
  if (opt.zip) return (0, _unzip.default)(excel.bind(void 0, _objectSpread(_objectSpread({}, opt), {}, {
    zip: undefined
  })), /\.xlsx$/);
  return (0, _exceljsTransformStream.default)({
    mapHeaders: header => header.trim()
  });
};

exports.excel = excel;

const ndjson = opt => {
  if (opt.zip) return (0, _unzip.default)(ndjson.bind(void 0, _objectSpread(_objectSpread({}, opt), {}, {
    zip: undefined
  })), /\.ndjson$/);
  return (0, _ndjsonNext.parse)();
};

exports.ndjson = ndjson;

const json = opt => {
  if (Array.isArray(opt.selector)) {
    const inStream = (0, _through.default)();

    const outStream = _through.default.obj();

    opt.selector.forEach(selector => (0, _stream.pipeline)(inStream, json(_objectSpread(_objectSpread({}, opt), {}, {
      selector
    })), outStream, err => {
      if (err) outStream.emit('error', err);
    }));
    return _duplexify.default.obj(inStream, outStream);
  }

  if (typeof opt.selector !== 'string') throw new Error('Missing selector for JSON parser!');
  if (opt.zip) return (0, _unzip.default)(json.bind(void 0, _objectSpread(_objectSpread({}, opt), {}, {
    zip: undefined
  })), /\.json$/);

  const head = _jsonstreamNext.default.parse(opt.selector);

  let header;
  head.once('header', data => header = data);

  const tail = _through.default.obj((row, _, cb) => {
    if (header && typeof row === 'object') row.___header = header; // internal attr, json header info for fetch stream

    cb(null, row);
  });

  return _pumpify.default.obj(head, tail);
};

exports.json = json;

const xml = opt => {
  if (opt.zip) return (0, _unzip.default)(xml.bind(void 0, _objectSpread(_objectSpread({}, opt), {}, {
    zip: undefined
  })), /\.xml$/);
  return _pumpify.default.obj((0, _xml2json.default)(opt), json(opt));
};

exports.xml = xml;

const html = opt => {
  if (opt.zip) return (0, _unzip.default)(html.bind(void 0, _objectSpread(_objectSpread({}, opt), {}, {
    zip: undefined
  })), /\.xml$/);
  return _pumpify.default.obj((0, _xml2json.default)(_objectSpread(_objectSpread({}, opt), {}, {
    strict: false
  })), json(opt));
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
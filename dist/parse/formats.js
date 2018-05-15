'use strict';

exports.__esModule = true;
exports.shp = exports.xml = exports.json = exports.excel = exports.csv = undefined;

var _xml2jsParser = require('xml2js-parser');

var _csvParser = require('csv-parser');

var _csvParser2 = _interopRequireDefault(_csvParser);

var _exceljsTransformStream = require('exceljs-transform-stream');

var _exceljsTransformStream2 = _interopRequireDefault(_exceljsTransformStream);

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _shp2json = require('shp2json');

var _shp2json2 = _interopRequireDefault(_shp2json);

var _duplexify = require('duplexify');

var _duplexify2 = _interopRequireDefault(_duplexify);

var _pumpify = require('pumpify');

var _pumpify2 = _interopRequireDefault(_pumpify);

var _pump = require('pump');

var _pump2 = _interopRequireDefault(_pump);

var _JSONStream = require('JSONStream');

var _JSONStream2 = _interopRequireDefault(_JSONStream);

var _camelize = require('camelize');

var _camelize2 = _interopRequireDefault(_camelize);

var _autoParse = require('./autoParse');

var _autoParse2 = _interopRequireDefault(_autoParse);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// these formatters receive one argument, "data source" object
// and return a stream that maps strings to items
const csv = exports.csv = opt => (0, _csvParser2.default)({
  mapHeaders: v => opt.camelize ? (0, _camelize2.default)(v) : v.trim(),
  mapValues: v => opt.autoParse ? (0, _autoParse2.default)(v) : v
});

const excel = exports.excel = opt => (0, _exceljsTransformStream2.default)({
  mapHeaders: v => opt.autoParse ? (0, _camelize2.default)(v) : v.trim(),
  mapValues: v => opt.autoParse ? (0, _autoParse2.default)(v) : v
});

const json = exports.json = opt => {
  if (!opt.selector) throw new Error('Missing selector for JSON parser!');
  const head = _JSONStream2.default.parse(opt.selector);
  let header;
  head.on('header', data => header = data);
  const tail = _through2.default.obj((row, _, cb) => {
    if (header) row.___header = header; // internal attr, json header info for fetch stream
    cb(null, row);
  });
  return _pumpify2.default.obj(head, tail);
};

const xml = exports.xml = opt => {
  const xmlParser = new _xml2jsParser.Parser({ explicitArray: false });
  const xml2JsonStream = _through2.default.obj((row, _, cb) => {
    const xml = row.toString();
    const js = xmlParser.parseStringSync(xml);
    const json = JSON.stringify(js);
    cb(null, json);
  });
  return _pumpify2.default.obj(xml2JsonStream, json(opt));
};

const shp = exports.shp = () => {
  const head = (0, _through2.default)();
  const mid = (0, _shp2json2.default)(head);
  const tail = _JSONStream2.default.parse('features.*');
  return _duplexify2.default.obj(head, (0, _pump2.default)(mid, tail));
};
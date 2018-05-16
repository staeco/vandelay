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

var _camelcase = require('camelcase');

var _camelcase2 = _interopRequireDefault(_camelcase);

var _autoParse = require('./autoParse');

var _autoParse2 = _interopRequireDefault(_autoParse);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// these formatters receive one argument, "data source" object
// and return a stream that maps strings to items
const csv = exports.csv = opt => {
  if (opt.camelcase && typeof opt.camelcase !== 'boolean') throw new Error('Invalid camelcase option');
  if (opt.autoParse && typeof opt.autoParse !== 'boolean') throw new Error('Invalid autoParse option');

  const head = (0, _csvParser2.default)({
    mapHeaders: v => opt.camelcase ? (0, _camelcase2.default)(v) : v.trim(),
    mapValues: v => opt.autoParse ? (0, _autoParse2.default)(v) : v
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
  return (0, _exceljsTransformStream2.default)({
    mapHeaders: v => opt.camelcase ? (0, _camelcase2.default)(v) : v.trim(),
    mapValues: v => opt.autoParse ? (0, _autoParse2.default)(v) : v
  });
};
const json = exports.json = opt => {
  if (typeof opt.selector !== 'string') throw new Error('Missing selector for JSON parser!');
  if (!opt.selector.includes('*')) throw new Error('Selector must contain a * somewhere!');

  const head = _JSONStream2.default.parse(opt.selector);
  let header;
  head.on('header', data => header = data);
  const tail = _through2.default.obj((row, _, cb) => {
    if (header && typeof row === 'object') row.___header = header; // internal attr, json header info for fetch stream
    cb(null, row);
  });
  return _pumpify2.default.obj(head, tail);
};

const xml = exports.xml = opt => {
  if (opt.camelcase && typeof opt.camelcase !== 'boolean') throw new Error('Invalid camelcase option');
  if (opt.autoParse && typeof opt.autoParse !== 'boolean') throw new Error('Invalid autoParse option');
  const valueProcessors = opt.autoParse ? [_autoParse2.default] : null;
  const nameProcessors = opt.camelcase ? [_camelcase2.default] : null;
  const xmlParser = new _xml2jsParser.Parser({
    explicitArray: false,
    valueProcessors,
    attrValueProcessors: valueProcessors,
    tagNameProcessors: nameProcessors,
    attrNameProcessors: nameProcessors
  });
  const xml2JsonStream = _through2.default.obj((row, _, cb) => {
    xmlParser.parseString(row.toString(), (err, js) => {
      cb(err, JSON.stringify(js));
    });
  });
  return _pumpify2.default.obj(xml2JsonStream, json(opt));
};

const shp = exports.shp = () => {
  const head = (0, _through2.default)();
  const mid = (0, _shp2json2.default)(head);
  const tail = _JSONStream2.default.parse('features.*');
  return _duplexify2.default.obj(head, (0, _pump2.default)(mid, tail));
};
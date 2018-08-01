'use strict';

exports.__esModule = true;

var _xml2jsParser = require('xml2js-parser');

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _camelcase = require('camelcase');

var _camelcase2 = _interopRequireDefault(_camelcase);

var _autoParse = require('./autoParse');

var _autoParse2 = _interopRequireDefault(_autoParse);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = opt => {
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
  return xml2JsonStream;
};

module.exports = exports['default'];
'use strict';

exports.__esModule = true;

var _xml2js = require('xml2js');

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
  const xmlOpt = {
    strict: opt.strict || true,
    explicitArray: false,
    valueProcessors,
    attrValueProcessors: valueProcessors,
    tagNameProcessors: nameProcessors,
    attrNameProcessors: nameProcessors
  };
  const xml2JsonStream = _through2.default.obj((row, _, cb) => {
    let str = row.toString();
    (0, _xml2js.parseString)(str, xmlOpt, (err, js) => {
      cb(err, JSON.stringify(js));
    });
  });
  return xml2JsonStream;
};

module.exports = exports.default;
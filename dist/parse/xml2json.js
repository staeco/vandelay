"use strict";

exports.__esModule = true;
exports.default = void 0;

var _xml2js = require("xml2js");

var _through = _interopRequireDefault(require("through2"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = opt => {
  const xmlOpt = {
    strict: opt.strict || true,
    explicitArray: false
  };

  const xml2JsonStream = _through.default.obj((row, _, cb) => {
    const str = row.toString();
    (0, _xml2js.parseString)(str, xmlOpt, (err, js) => {
      cb(err, JSON.stringify(js));
    });
  });

  return xml2JsonStream;
};

exports.default = _default;
module.exports = exports.default;
'use strict';

exports.__esModule = true;

var _pumpify = require('pumpify');

var _pumpify2 = _interopRequireDefault(_pumpify);

var _merge = require('merge2');

var _merge2 = _interopRequireDefault(_merge);

var _duplexify = require('duplexify');

var _duplexify2 = _interopRequireDefault(_duplexify);

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _unzipper = require('unzipper');

var _unzipper2 = _interopRequireDefault(_unzipper);

var _endOfStream = require('end-of-stream');

var _endOfStream2 = _interopRequireDefault(_endOfStream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = (parser, regex) => {
  const out = (0, _merge2.default)({ end: false });

  const dataStream = _pumpify2.default.obj(_unzipper2.default.Parse(), _through2.default.obj((entry, _, cb) => {
    if (entry.type !== 'File' || !regex.test(entry.path)) {
      entry.autodrain();
      return cb();
    }
    const file = _pumpify2.default.obj(entry, parser);
    out.add(file);
    (0, _endOfStream2.default)(file, cb);
  }));

  (0, _endOfStream2.default)(dataStream, () => out.push(null));
  return _duplexify2.default.obj(dataStream, out, { end: false });
};

module.exports = exports.default;
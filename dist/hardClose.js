"use strict";

exports.__esModule = true;
exports.default = void 0;

function _ref() {}

// not only does it call close, but makes sure any further events are ignored
// useful for limiting # of items you want
var _default = stream => {
  if (stream._closed) return; // already hard closed

  stream._closed = true;
  stream.write = _ref; // kill ability for anything to write anymore, its over

  if (stream.end) return stream.end();
  if (stream.destroy) return stream.destroy();
  throw new Error('Invalid stream - no end or destroy');
};

exports.default = _default;
module.exports = exports.default;
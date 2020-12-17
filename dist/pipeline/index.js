"use strict";

exports.__esModule = true;
exports.default = void 0;

var _readableStream = require("readable-stream");

var _streamExhaust = _interopRequireDefault(require("stream-exhaust"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable no-loops/no-loops */
const pipe = (...s) => (0, _readableStream.pipeline)(...s);

pipe.exhaust = (...s) => (0, _streamExhaust.default)(pipe(...s));

var _default = pipe;
exports.default = _default;
module.exports = exports.default;
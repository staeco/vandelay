"use strict";

exports.__esModule = true;
exports.default = exports.exhaust = void 0;

var _readableStream = require("readable-stream");

var _streamExhaust = _interopRequireDefault(require("stream-exhaust"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable no-loops/no-loops */
const exhaust = (...s) => (0, _streamExhaust.default)((0, _readableStream.pipeline)(...s));

exports.exhaust = exhaust;
var _default = _readableStream.pipeline;
exports.default = _default;
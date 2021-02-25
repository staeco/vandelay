"use strict";

var _worker = require("threads/worker");

var _moize = _interopRequireDefault(require("moize"));

var _sandbox = require("../sandbox");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const memoized = _moize.default.deep(_sandbox.getDefaultFunction, {
  maxSize: 8
});

(0, _worker.expose)(async (transformer, opt = {}, record, meta) => {
  if (typeof record === 'undefined') return; // this was a warm-up call

  const fn = memoized(transformer, opt);
  return fn(record, meta);
});
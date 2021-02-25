"use strict";

exports.__esModule = true;
exports.default = void 0;

var _threads = require("threads");

var _stream = require("stream");

var _isPlainObj = _interopRequireDefault(require("is-plain-obj"));

var _objectTransformStack = require("object-transform-stack");

var _moize = _interopRequireDefault(require("moize"));

var _pTimeout = _interopRequireDefault(require("p-timeout"));

var _sandbox = require("../sandbox");

var _tap = _interopRequireDefault(require("../tap"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const asyncTimeout = 120000; // 2 mins

const defaultConcurrency = 8; // this timeout provides helpful context if a pipeline is stalling by signalling which piece is causing the issue

const pWrap = async (p, name) => {
  if (!p || !p.then) return p; // not a promise, skip the async timeout instrumentation

  return (0, _pTimeout.default)(p, asyncTimeout, `${name} timed out`);
}; // transformer can either be an object, a string, or a function


function _ref() {
  return (0, _threads.spawn)(new _threads.Worker('./worker'));
}

function _ref2() {
  return null;
}

const getTransformFunction = _moize.default.deep((transformer, opt = {}) => {
  // object transform - run it as object-transform-stack in thread
  if ((0, _isPlainObj.default)(transformer)) {
    const stack = transformer;
    return v => (0, _objectTransformStack.transform)(stack, v, opt);
  } // custom code importer with pooling enabled - run it in the worker pool


  if (typeof transformer === 'string' && opt.pooling === true) {
    const pool = (0, _threads.Pool)(_ref, opt.concurrency || defaultConcurrency);

    const transformFn = async (record, meta) => pool.queue(async (work) => work(transformer, {
      timeout: opt.timeout
    }, record, meta));

    transformFn().catch(_ref2); // warm up the pool

    transformFn.pool = pool;
    return transformFn;
  } // custom code importer with pooling disabled - run it in our thread


  if (typeof transformer === 'string') {
    return (0, _sandbox.getDefaultFunction)(transformer, opt);
  } // already was a function - basically do nothing here


  if (typeof transformer !== 'function') throw new Error('Invalid transform function!');
  return transformer;
}, {
  maxSize: 8
});

var _default = (transformer, opt = {}) => {
  const transformFn = getTransformFunction(transformer, opt);

  const transform = async (record, meta) => {
    if (opt.onBegin) await pWrap(opt.onBegin(record, meta), 'onBegin'); // filter

    if (typeof opt.filter === 'function') {
      let filter;

      try {
        filter = await pWrap(opt.filter(record, meta), 'filter');
      } catch (err) {
        if (opt.onError) await pWrap(opt.onError(err, record, meta), 'onError');
        return;
      }

      if (filter != true) {
        if (opt.onSkip) await pWrap(opt.onSkip(record, meta), 'onSkip');
        return;
      }
    } // transform it


    let transformed;

    try {
      transformed = await pWrap(transformFn(record, meta), 'transform');
    } catch (err) {
      if (opt.onError) await pWrap(opt.onError(err, record, meta), 'onError');
      return;
    }

    if (!transformed) {
      if (opt.onSkip) await pWrap(opt.onSkip(record, meta), 'onSkip');
      return;
    }

    if (opt.onSuccess) await pWrap(opt.onSuccess(transformed, record, meta), 'onSuccess');
    return transformed;
  };

  const outStream = (0, _tap.default)(transform, opt);

  function _ref3() {
    transformFn.pool.terminate();
  }

  if (transformFn.pool) {
    (0, _stream.finished)(outStream, _ref3);
  }

  return outStream;
};

exports.default = _default;
module.exports = exports.default;
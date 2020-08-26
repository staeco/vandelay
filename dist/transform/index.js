"use strict";

exports.__esModule = true;
exports.default = void 0;

var _threads = require("threads");

var _readableStream = require("readable-stream");

var _isPlainObj = _interopRequireDefault(require("is-plain-obj"));

var _objectTransformStack = require("object-transform-stack");

var _moize = _interopRequireDefault(require("moize"));

var _sandbox = require("../sandbox");

var _tap = _interopRequireDefault(require("../tap"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// transformer can either be an object, a string, or a function
const getTransformFunction = _moize.default.deep((transformer, opt = {}) => {
  // object transform - run it as object-transform-stack in thread
  if ((0, _isPlainObj.default)(transformer)) {
    const stack = transformer;
    return v => (0, _objectTransformStack.transform)(stack, v, opt);
  } // custom code importer with pooling enabled - run it in the worker pool


  if (typeof transformer === 'string' && opt.pooling === true) {
    const pool = (0, _threads.Pool)(() => (0, _threads.spawn)(new _threads.Worker('./worker')), opt.concurrency || 8);

    const transformFn = async (record, meta) => pool.queue(async (work) => work(transformer, {
      timeout: opt.timeout
    }, record, meta));

    transformFn().catch(() => null); // warm up the pool

    transformFn.pool = pool;
    return transformFn;
  } // custom code importer with pooling disabled - run it in our thread


  if (typeof transformer === 'string') {
    return (0, _sandbox.getDefaultFunction)(transformer, opt);
  } // already was a function - basically do nothing here


  if (typeof transformer !== 'function') throw new Error('Invalid transform function!');
  return transformer;
});

var _default = (transformer, opt = {}) => {
  const transformFn = getTransformFunction(transformer, opt);

  const transform = async (record, meta) => {
    if (opt.onBegin) await opt.onBegin(record, meta); // filter

    if (typeof opt.filter === 'function') {
      let filter;

      try {
        filter = await opt.filter(record, meta);
      } catch (err) {
        if (opt.onError) await opt.onError(err, record, meta);
        return;
      }

      if (filter != true) {
        if (opt.onSkip) await opt.onSkip(record, meta);
        return;
      }
    } // transform it


    let transformed;

    try {
      transformed = await transformFn(record, meta);
    } catch (err) {
      if (opt.onError) await opt.onError(err, record, meta);
      return;
    }

    if (!transformed) {
      if (opt.onSkip) await opt.onSkip(record, meta);
      return;
    }

    if (opt.onSuccess) await opt.onSuccess(transformed, record, meta);
    return transformed;
  };

  const outStream = (0, _tap.default)(transform, opt);

  if (transformFn.pool) {
    (0, _readableStream.finished)(outStream, () => {
      transformFn.pool.terminate();
    });
  }

  return outStream;
};

exports.default = _default;
module.exports = exports.default;
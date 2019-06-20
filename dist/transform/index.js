"use strict";

exports.__esModule = true;
exports.default = void 0;

var _objectTransformStack = require("object-transform-stack");

var _isPlainObject = _interopRequireDefault(require("is-plain-object"));

var _sandbox = _interopRequireDefault(require("./sandbox"));

var _tap = _interopRequireDefault(require("../tap"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = (transformer, opt = {}) => {
  if ((0, _isPlainObject.default)(transformer)) {
    const stack = transformer;

    transformer = v => (0, _objectTransformStack.transform)(stack, v, opt);
  }

  if (typeof transformer === 'string') transformer = (0, _sandbox.default)(transformer, opt);
  const transformFn = transformer.default || transformer;
  if (typeof transformFn !== 'function') throw new Error('Invalid transform function!');

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

  return (0, _tap.default)(transform, opt);
};

exports.default = _default;
module.exports = exports.default;
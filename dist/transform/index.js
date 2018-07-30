'use strict';

exports.__esModule = true;

var _objectTransformStack = require('object-transform-stack');

var _sandbox = require('./sandbox');

var _sandbox2 = _interopRequireDefault(_sandbox);

var _tap = require('../tap');

var _tap2 = _interopRequireDefault(_tap);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = (transformer, opt = {}) => {
  if (Array.isArray(transformer)) {
    const stack = transformer;
    transformer = v => (0, _objectTransformStack.transform)(stack, v, opt);
  }
  if (typeof transformer === 'string') transformer = (0, _sandbox2.default)(transformer, opt);
  const transformFn = transformer.default || transformer;
  if (typeof transformFn !== 'function') throw new Error('Invalid transform function!');

  const transform = async (record, meta) => {
    if (opt.onBegin) opt.onBegin(record, meta);

    // filter
    if (typeof opt.filter === 'function') {
      let filter;
      try {
        filter = await opt.filter(record, meta);
      } catch (err) {
        if (opt.onError) opt.onError(err, record, meta);
        return;
      }
      if (filter != true) {
        if (opt.onSkip) opt.onSkip(record, meta);
        return;
      }
    }

    // transform it
    let transformed;
    try {
      transformed = await transformFn(record, meta);
    } catch (err) {
      if (opt.onError) opt.onError(err, record, meta);
      return;
    }
    if (!transformed) {
      if (opt.onSkip) opt.onSkip(record, meta);
      return;
    }
    if (opt.onSuccess) opt.onSuccess(transformed, record, meta);
    return transformed;
  };
  return (0, _tap2.default)(transform, opt);
};

module.exports = exports['default'];
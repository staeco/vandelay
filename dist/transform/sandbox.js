'use strict';

exports.__esModule = true;

var _vm = require('vm2');

exports.default = (code, opt = {}) => {
  const vm = new _vm.NodeVM({
    console: 'inherit',
    timeout: opt.timeout,
    compiler: opt.compiler,
    require: false
  });
  if (opt.sandbox) {
    Object.keys(opt.sandbox).forEach(k => {
      vm.freeze(opt.sandbox[k], k);
    });
  }
  const fn = vm.run(code, 'compiled-transform.js');
  if (fn == null) throw new Error('Failed to export something!');
  return fn;
};

module.exports = exports['default'];
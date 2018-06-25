'use strict';

exports.__esModule = true;

var _vm = require('vm2');

exports.default = (code, opt = {}) => {
  const script = new _vm.VMScript(opt.compiler ? opt.compiler(code) : code);
  const vm = new _vm.NodeVM({
    console: opt.console,
    timeout: opt.timeout
  });
  if (opt.sandbox) {
    Object.keys(opt.sandbox).forEach(k => {
      vm.freeze(opt.sandbox[k], k);
    });
  }
  const fn = vm.run(script, 'compiled-transform.js');
  if (fn == null) throw new Error('Failed to export something!');
  return fn;
};

module.exports = exports['default'];
'use strict';

exports.__esModule = true;

var _vm = require('vm2');

exports.default = (code, sandbox = {}) => {
  const vm = new _vm.NodeVM({
    console: 'inherit',
    require: false
  });
  Object.keys(sandbox).forEach(k => {
    vm.freeze(sandbox[k], k);
  });
  const fn = vm.run(code, 'compiled-transform.js');
  if (fn == null) throw new Error('Failed to export something!');
  return fn;
};

module.exports = exports['default'];
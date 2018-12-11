'use strict';

exports.__esModule = true;

var _vm = require('vm2');

var _domain = require('domain');

var _domain2 = _interopRequireDefault(_domain);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = (code, opt = {}) => {
  let fn;
  const domain = _domain2.default.create();
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
  domain.on('error', () => {}); // swallow async errors
  domain.run(() => {
    fn = vm.run(script, 'compiled-transform.js');
  });
  if (fn == null) throw new Error('Failed to export something!');
  return (...args) => {
    const internalDomain = _domain2.default.create();
    return new Promise((resolve, reject) => {
      internalDomain.on('error', reject); // report async errors
      let out;
      internalDomain.run(() => {
        out = fn(...args);
      });
      resolve(out);
    });
  };
};

module.exports = exports.default;
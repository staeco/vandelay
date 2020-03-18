"use strict";

exports.__esModule = true;
exports.default = void 0;

var _vm = require("vm2");

var _domain = _interopRequireDefault(require("domain"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const allowedBuiltins = ['assert', 'buffer', 'crypto', 'dgram', 'dns', 'events', 'http', 'https', 'http2', 'path', 'querystring', 'stream', 'string_decoder', 'timers', 'tls', 'url', 'util', 'zlib'];

var _default = (code, opt = {}) => {
  let fn;

  const domain = _domain.default.create();

  const script = new _vm.VMScript(opt.compiler ? opt.compiler(code) : code);
  const vm = new _vm.NodeVM({
    console: opt.console,
    timeout: opt.timeout,
    nesting: false,
    require: {
      external: {
        modules: ['core-js', 'core-js/*']
      },
      builtin: allowedBuiltins
    }
  }); // custom globals

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
    const internalDomain = _domain.default.create();

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

exports.default = _default;
module.exports = exports.default;
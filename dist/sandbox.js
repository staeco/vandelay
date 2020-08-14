"use strict";

exports.__esModule = true;
exports.default = void 0;

var _vm = require("vm2");

var _domain = _interopRequireDefault(require("domain"));

var _textEncoding = require("text-encoding");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const defaultSandbox = {
  URL,
  URLSearchParams,
  TextEncoder: global.TextEncoder || _textEncoding.TextEncoder,
  TextDecoder: global.TextDecoder || _textEncoding.TextDecoder
};
const allowedBuiltins = ['assert', 'buffer', 'crypto', 'dgram', 'dns', 'events', 'http', 'https', 'http2', 'path', 'querystring', 'stream', 'string_decoder', 'timers', 'tls', 'url', 'util', 'zlib'];

const addIn = (vm, sandbox) => {
  Object.keys(sandbox).forEach(k => {
    vm.freeze(sandbox[k], k);
  });
};

var _default = (code, opt = {}) => {
  let fn;

  const topDomain = _domain.default.create();

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

  addIn(vm, defaultSandbox);
  if (opt.sandbox) addIn(vm, opt.sandbox); // topDomain is for evaluating the script
  // any errors thrown outside the transform fn are caught here

  topDomain.on('error', () => {}); // swallow async errors

  topDomain.run(() => {
    fn = vm.run(script, 'compiled-transform.js');
  });
  if (fn == null) throw new Error('Failed to export something!');
  return (...args) => {
    // internalDomain is for evaluating the transform function
    // any errors thrown inside the transform fn are caught here
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
"use strict";

exports.__esModule = true;
exports.getDefaultFunction = exports.default = void 0;

var _vm = require("vm2");

var _domain = _interopRequireDefault(require("domain"));

var _util = require("util");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const defaultSandbox = {
  URL,
  URLSearchParams,
  TextEncoder: _util.TextEncoder,
  TextDecoder: _util.TextDecoder
};
const allowedBuiltins = ['assert', 'buffer', 'crypto', 'dgram', 'dns', 'events', 'http', 'https', 'http2', 'path', 'querystring', 'stream', 'string_decoder', 'timers', 'tls', 'url', 'util', 'zlib'];

const addIn = (vm, sandbox) => {
  Object.keys(sandbox).forEach(k => {
    vm.freeze(sandbox[k], k);
  });
};

const getDefaultFunction = (code, opt) => {
  const out = sandbox(code, opt);
  const transformFn = out.default || out;
  if (typeof transformFn !== 'function') throw new Error('Invalid transform function!');
  return transformFn;
};

exports.getDefaultFunction = getDefaultFunction;

function _ref() {}

const sandbox = (code, opt = {}) => {
  let fn;

  const topDomain = _domain.default.create();

  const script = new _vm.VMScript(opt.compiler ? opt.compiler(code) : code);
  const vm = new _vm.NodeVM({
    console: opt.console,
    timeout: opt.timeout,
    sandbox: opt.unsafeGlobals,
    nesting: false,
    require: {
      external: {
        modules: opt.externalModules || []
      },
      builtin: opt.coreModules || allowedBuiltins,
      mock: opt.mockModules
    }
  }); // custom globals

  addIn(vm, defaultSandbox);
  if (opt.globals) addIn(vm, opt.globals); // topDomain is for evaluating the script
  // any errors thrown outside the transform fn are caught here

  topDomain.on('error', _ref); // swallow async errors

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
      // hack for issue when using HTTP agents and domains... https://github.com/nodejs/node/issues/40999#issuecomment-1002719169=

      setTimeout(() => {
        let out;
        internalDomain.run(() => {
          out = fn(...args);
        });
        resolve(out);
      }, 0);
    });
  };
};

var _default = sandbox;
exports.default = _default;
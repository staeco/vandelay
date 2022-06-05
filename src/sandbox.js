import { NodeVM, VMScript } from 'vm2'
import domains from 'domain'
import { TextEncoder, TextDecoder } from 'util'
import { nextTick } from 'process'

const defaultSandbox = {
  URL, URLSearchParams,
  TextEncoder, TextDecoder
}

const allowedBuiltins = [
  'assert',
  'buffer',
  'crypto',
  'dgram',
  'dns',
  'events',
  'http',
  'https',
  'http2',
  'path',
  'querystring',
  'stream',
  'string_decoder',
  'timers',
  'tls',
  'url',
  'util',
  'zlib'
]

const addIn = (vm, sandbox) => {
  Object.keys(sandbox).forEach((k) => {
    vm.freeze(sandbox[k], k)
  })
}

export const getDefaultFunction = (code, opt) => {
  const out = sandbox(code, opt)
  const transformFn = out.default || out
  if (typeof transformFn !== 'function') throw new Error('Invalid transform function!')
  return transformFn
}

// setTimeout(0) is for issue when using HTTP agents and domains... https://github.com/nodejs/node/issues/40999#issuecomment-1002719169=
const sandbox = (code, opt = {}) => {
  let fn
  const script = new VMScript(opt.compiler ? opt.compiler(code) : code)
  const vm = new NodeVM({
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
  })
  // custom globals
  addIn(vm, defaultSandbox)
  if (opt.globals) addIn(vm, opt.globals)

  // topDomain is for evaluating the script
  // any errors thrown outside the transform fn are caught here
  const topDomain = domains.create()
  topDomain.on('error', () => {}) // swallow async errors
  nextTick(() => {
    topDomain.run(() => {
      fn = vm.run(script, 'compiled-transform.js')
    })
    if (fn == null) throw new Error('Failed to export something!')
  })
  return (...args) => {
    // internalDomain is for evaluating the transform function
    // any errors thrown inside the transform fn are caught here
    const internalDomain = domains.create()
    return new Promise((resolve, reject) => {
      internalDomain.on('error', reject) // report async errors
      nextTick(() => {
        let out
        internalDomain.run(() => {
          out = fn(...args)
        })
        resolve(out)
      })
    })
  }
}
export default sandbox

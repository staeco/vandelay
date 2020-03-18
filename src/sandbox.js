import { NodeVM, VMScript } from 'vm2'
import domains from 'domain'

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

export default (code, opt={}) => {
  let fn
  const domain = domains.create()
  const script = new VMScript(opt.compiler ? opt.compiler(code) : code)
  const vm = new NodeVM({
    console: opt.console,
    timeout: opt.timeout,
    nesting: false,
    require: {
      external: {
        modules: [
          'core-js',
          'core-js/*'
        ]
      },
      builtin: allowedBuiltins
    }
  })

  // custom globals
  if (opt.sandbox) {
    Object.keys(opt.sandbox).forEach((k) => {
      vm.freeze(opt.sandbox[k], k)
    })
  }
  domain.on('error', () => {}) // swallow async errors
  domain.run(() => {
    fn = vm.run(script, 'compiled-transform.js')
  })
  if (fn == null) throw new Error('Failed to export something!')
  return (...args) => {
    const internalDomain = domains.create()
    return new Promise((resolve, reject) => {
      internalDomain.on('error', reject) // report async errors
      let out
      internalDomain.run(() => {
        out = fn(...args)
      })
      resolve(out)
    })
  }
}

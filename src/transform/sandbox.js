import { NodeVM, VMScript } from 'vm2'

export default (code, opt={}) => {
  const script = new VMScript(opt.compiler ? opt.compiler(code) : code)
  const vm = new NodeVM({
    console: opt.console,
    timeout: opt.timeout
  })
  if (opt.sandbox) {
    Object.keys(opt.sandbox).forEach((k) => {
      vm.freeze(opt.sandbox[k], k)
    })
  }
  const fn = vm.run(script, 'compiled-transform.js')
  if (fn == null) throw new Error('Failed to export something!')
  return fn
}

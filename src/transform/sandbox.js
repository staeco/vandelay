import { NodeVM } from 'vm2'

export default (code, opt={}) => {
  const vm = new NodeVM({
    console: 'inherit',
    timeout: opt.timeout,
    compiler: opt.compiler,
    require: false
  })
  if (opt.sandbox) {
    Object.keys(opt.sandbox).forEach((k) => {
      vm.freeze(opt.sandbox[k], k)
    })
  }
  const fn = vm.run(code, 'compiled-transform.js')
  if (fn == null) throw new Error('Failed to export something!')
  return fn
}

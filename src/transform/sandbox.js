import { NodeVM } from 'vm2'

export default (code, sandbox={}) => {
  const vm = new NodeVM({
    console: 'inherit',
    require: false
  })
  Object.keys(sandbox).forEach((k) => {
    vm.freeze(sandbox[k], k)
  })
  const fn = vm.run(code, 'compiled-transform.js')
  if (fn == null) throw new Error('Failed to export something!')
  return fn
}

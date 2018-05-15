const isInt = (v) => /^(-|\+)?([1-9]+[0-9]*)$/.test(v)
const isFloat = (v) => v - parseFloat(v) + 1 >= 0

export default (v) => {
  if (v.trim() === '') return undefined
  if (v === '-') return null
  if (v === 'true' || v === 'TRUE') return true
  if (v === 'false' || v === 'FALSE') return false
  if (isInt(v)) return parseInt(v)
  if (isFloat(v)) return parseFloat(v)

  const d = Date.parse(v)
  if (!isNaN(d)) return d

  return v
}

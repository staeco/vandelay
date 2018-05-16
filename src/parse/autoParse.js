import parseNumber from 'parse-decimal-number'
import parseDate from 'date-fns/parse'

export default (v) => {
  if (typeof v !== 'string') return v // already parsed upstream!
  v = v.trim()
  if (v === '') return undefined
  if (v.toLowerCase() === 'null') return null
  if (v === '-') return null
  if (v.toLowerCase() === 'true') return true
  if (v.toLowerCase() === 'false') return false
  if (v === 'NaN') return NaN

  const n = parseNumber(v)
  if (!isNaN(n)) return n

  const d = parseDate(v)
  if (!isNaN(d)) return d

  return v
}

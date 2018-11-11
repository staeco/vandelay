import parseNumber from 'parse-decimal-number'

const auto = (v) => {
  if (typeof v !== 'string') return v // already parsed upstream!
  v = v.trim()
  if (!v) return
  if (v === '-') return null
  if (v === 'NaN') return NaN
  const lower = v.toLowerCase()
  if (lower === 'null') return null
  if (lower === 'undefined') return
  if (lower === 'true' || lower === 'yes' || lower === 'y') return true
  if (lower === 'false' || lower === 'no' || lower === 'n') return false

  const n = parseNumber(v)
  if (!isNaN(n)) return n

  const d = new Date(v)
  if (!isNaN(d)) return d

  try {
    return JSON.parse(v)
  } catch (e) {
    // not json
  }

  return v
}

export default auto

import parseNumber from 'parse-decimal-number'

const msftDate = /\/Date\((\d+)(?:([-+])(\d+))?\)\//i
const parseMicrosoftDate = (v) => {
  const res = msftDate.exec(v)
  if (!res) return
  const [ , rsr, tzop, tzoffset ] = res
  const ts = parseInt(rsr, 10)
  let offset = 0
  if (tzop != null && tzoffset != null) {
    const east = tzop == '+'
    const hh = parseInt(tzoffset.slice(0, 2), 10)
    const mm = parseInt(tzoffset.slice(2), 10)
    offset = hh * 60 + mm - new Date().getTimezoneOffset()
    if (east) offset = -offset
  }
  return new Date(ts + offset * 60000)
}

// order of operations is crucial here
export const simple = (v) => {
  if (typeof v !== 'string') return v // already parsed upstream!

  // basics first
  v = v.trim()
  if (!v) return
  if (v === '-') return null
  if (v === 'NaN') return NaN

  // asp .net dates
  const msftDate = parseMicrosoftDate(v)
  if (msftDate) return msftDate

  // any json values
  try {
    return JSON.parse(v)
  } catch (e) {
    // not json
  }

  const lower = v.toLowerCase()
  if (lower === 'null') return null
  if (lower === 'undefined') return
  if (lower === 'true' || lower === 'yes' || lower === 'y') return true
  if (lower === 'false' || lower === 'no' || lower === 'n') return false

  const n = parseNumber(v)
  if (!isNaN(n)) return n

  const d = new Date(v)
  if (!isNaN(d)) return d

  return v
}

/*
export const aggressive = (obj) => {

}

export const extreme = (obj) => {

}
*/

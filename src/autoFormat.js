import parseNumber from 'parse-decimal-number'
import camelcase from 'camelcase'

const transformObject = (o, fn) => {
  if (!o || typeof o !== 'object') return fn(o)[0]
  // recurse arrays
  if (Array.isArray(o)) return o.map((v) => transformObject(v, fn))

  return Object.entries(o).reduce((prev, [ k, v ]) => {
    const res = fn(v, k)
    prev[res[1]] = res[0]
    return prev
  }, {})
}

const renamePatterns = {
  location: (o) => {
    if (o.location != null) return // already has something there
    const possible = [
      [ 'lon', 'lat' ],
      [ 'longitude', 'latitude' ],
      [ 'x', 'y' ]
    ]
    const match = possible.find(([ lonK, latK ]) =>
      typeof o[lonK] === 'number' && typeof o[latK] === 'number'
    )
    if (!match) return // no keys found
    const [ lon, lat ] = match
    o.location = {
      type: 'Point',
      coordinates: [ o[lon], o[lat] ]
    }
    delete o[lon]
    delete o[lat]
  },
  path: (o) => {
    if (o.path != null) return // already has something there
    const possible = [
      [ 'startLon', 'startLat', 'endLon', 'endLat' ],
      [ 'startLongitude', 'startLatitude', 'endLongitude', 'endLatitude' ],
      [ 'startX', 'startY', 'endX', 'endY' ]
    ]
    const match = possible.find(([ slonK, slatK, elonK, elatK ]) =>
      typeof o[slonK] === 'number' && typeof o[slatK] === 'number'
        && typeof o[elonK] === 'number' && typeof o[elatK] === 'number'
    )
    if (!match) return // no keys found
    const [ slon, slat, elon, elat ] = match
    o.location = {
      type: 'LineString',
      coordinates: [
        [ o[slon], o[slat] ],
        [ o[elon], o[elat] ]
      ]
    }
    delete o[slon]
    delete o[slat]
    delete o[elon]
    delete o[elat]
  }
}

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
export const infer = (v) => {
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

export const simple = (obj) =>
  transformObject(obj, (v, k) => [ infer(v), k && k.trim() ])

export const aggressive = (obj) =>
  transformObject(obj, (v, k) => [ infer(v), k && camelcase(k) ])

export const extreme = (obj) => {
  const nobj = aggressive(obj)
  if (!nobj || Array.isArray(nobj) || typeof nobj !== 'object') return nobj
  Object.values(renamePatterns).forEach((rename) => rename(nobj))
  return nobj
}

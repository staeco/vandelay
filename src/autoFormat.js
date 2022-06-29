import parseNumber from 'parse-decimal-number'
import wkx from 'wkx'
import camelcase from 'camelcase'
import isObject from 'is-plain-obj'
import moment from 'moment'

const minLooseLength = 25
const looseDateFormats = [
  'ddd MMM DD YYYY HH:mm:ss ZZ', // Tue May 15 2018 12:07:52 GMT-0400 (EDT)
  'MMM DD, YYYY HH:mm:ss ZZ', // May 15, 2018 12:07:52 -0400
  'ddd, DD MMM YYYY HH:mm:ss ZZ' // Tue, 15 May 2018 16:07:52 GMT
]
const strictDateFormats = [
  moment.RFC_2822,
  moment.ISO_8601,
  'YYYY-MM-DD hh:mm:ss a', // 2016-01-01 11:31:23 PM
  'MMMM Do, YYYY', // February 3rd, 2014
  'MMMM D, YYYY', // February 3, 2014
  'MMM D, YYYY', // Feb 3, 2014
  'YYYY-M-D', // 2019-5-15
  'YYYY-MM-DD', // 2019-05-15
  'M/D/YYYY', // 1/2/2019
  'MM/DD/YYYY', // 01/02/2019
  'M-D-YYYY', // 1-2-2019
  'MM-DD-YYYY', // 01-02-2019
  'M/YYYY', // 5/2018
  'M-YYYY' // 5-2018
]

const transformObject = (o, fn) => {
  // recurse arrays
  if (Array.isArray(o)) return o.map((v) => transformObject(v, fn))

  // flat value? return it
  if (!isObject(o)) return fn(o)[0]

  // dive into the object
  return Object.entries(o).reduce((prev, [ k, v ]) => {
    const res = fn(v, k)

    if (typeof res[0] === 'undefined') return prev

    // recurse arrays or objects nested in object
    if (Array.isArray(res[0])) {
      res[0] = res[0].map((v) => transformObject(v, fn))
    }
    if (isObject(res[0])) {
      res[0] = transformObject(res[0], fn)
    }

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

const msftDate = /\/date\((\d+)(?:([+-])(\d+))?\)\//i
const parseMicrosoftDate = (v) => {
  const res = msftDate.exec(v)
  if (!res) return
  const [ , rsr, , ] = res
  return new Date(Number(rsr)) //number is stored as UTC anyway, so ignore the offset when parsing
}

// order of operations is crucial here
export const infer = (v) => {
  if (typeof v !== 'string') return v // already parsed upstream!

  // basics first
  v = v.trim()
  if (v.length === 0) return
  if (v === '-') return null
  if (v === 'NaN') return NaN

  // asp .net dates
  const msftDate = parseMicrosoftDate(v)
  if (msftDate) return msftDate

  // wkx
  try {
    return wkx.Geometry.parse(v).toGeoJSON()
  } catch (e) {
    // not wkx
  }

  // any json values
  try {
    const jv = JSON.parse(v)
    // for numbers larger than the js max, just turn them into strings
    if (jv !== Infinity) return jv
  } catch (e) {
    // not json
  }
  const lower = v.toLowerCase()
  if (lower === 'null') return null
  if (lower === 'undefined') return
  if (lower === 'true' || lower === 'yes' || lower === 'y') return true
  if (lower === 'false' || lower === 'no' || lower === 'n') return false

  const n = parseNumber(v)
  if (!isNaN(n) && n !== Infinity) return n

  // conservative
  const d2 = moment(v, strictDateFormats, true)
  if (d2.isValid()) return d2.toDate()

  // looser
  if (v.length >= minLooseLength) {
    const d = moment(v, looseDateFormats)
    if (d.isValid()) return new Date(Date.parse(v))
  }
  return v
}

export const simple = (obj) =>
  transformObject(obj, (v, k) => [ infer(v), k?.trim() ])

export const aggressive = (obj) =>
  transformObject(obj, (v, k) => [ infer(v), k && camelcase(k) ])

export const extreme = (obj) => {
  const nobj = aggressive(obj)
  if (!nobj || Array.isArray(nobj) || typeof nobj !== 'object') return nobj
  Object.values(renamePatterns).forEach((rename) => rename(nobj))
  return nobj
}

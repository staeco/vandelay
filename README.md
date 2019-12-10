<p align='center'>
  <img src='https://user-images.githubusercontent.com/425716/40067683-bddc82ee-5834-11e8-8dc9-8b6ad5d149f5.png' width='400'/>
  <p align='center'>Dead simple data pipeline utility belt.</p>
</p>

# vandelay [![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url]


## Install

```
npm install vandelay --save
```

## Example - Flat File

```js
import { tap, fetch, transform, parse } from 'vandelay'

fetch({
  url: 'http://google.com/example.geojson',
  parser: parse('geojson')
})
  .pipe(transform(async (row) => {
    const external = await otherApi(row.field)
    return {
      ...row,
      external
    }
  }))
  .pipe(tap(async (row, meta) => {
    // send row to an external api, db, or whatever!
  }))
```

## Example - API

```js
import { tap, fetch, transform, parse } from 'vandelay'

fetch({
  url: 'http://google.com/api/example',
  parser: parse('json', { selector: 'results.*' }),
  pagination: {
    offsetParam: 'offset',
    limitParam: 'limit'
  }
})
  .pipe(transform(async (row, meta) => {
    const external = await otherApi(row.field)
    return {
      ...row,
      external
    }
  }))
  .pipe(tap(async (row, meta) => {
    // send row to an external api, db, or whatever!
  }))
```

## API

### fetch(source[, options])

Returns a stream that fetches the given source and emits the parsed and selected objects.

#### source

- url - Required `String`
- parser - Required `Function`
- pagination - Optional `Object`
  - offsetParam - Required `String` (if not using pageParam)
  - pageParam - Required `String` (if not using offsetParam)
  - limitParam - Required `String`
  - startPage - Optional `Number`, defaults to 0
  - limit - Required `Number`
- oauth - Optional `Object`
  - grant - Required `Object`
    - url - Required `String`
      - OAuth2 API URL
    - type - Required `String`
      - Grant type, can be any [OAuth2 grant type](https://oauth.net/2/grant-types/)
- headers - Optional `Object`

#### options

- concurrency - Optional `Number`, defaults to 10
- timeout - Optional `Number`
  - Timeout for the entire request, defaults to one day
- connectTimeout - Optional `Number`
  - Timeout to establish the initial connection, defaults to five minutes
- context - Optional `Object`
  - If specified, will be templated into the URL via [RFC6570](https://tools.ietf.org/html/rfc6570)
- pre - Optional `Function` or `String`
  - Asynchronous function, runs once before the request starts for each source. Receives `source` as an argument.
  - If it a string, it will compile it and sandbox it using [vm2](https://github.com/patriksimek/vm2).
  - Returns an object that controls request parameters.
- sandbox - Optional `Object`
  - Creates a frozen global context, used for sandboxed pre functions
  - Only applies when using a string pre function
- timeout - Optional `Number`
  - Only applies when using a string pre function
- compiler - Optional `Function`
  - Only applies when using a string pre function
- onError - Optional `Function`
  - Receives a context object when an error occurs, so you can decide how to handle the error and opt out of the default behavior.
  - The default handler will emit an error on the stream.
- onFetch - Optional `Function`
  - Receives the URL as the only argument, for debugging or logging purposes.
  - Called every time an HTTP request is created.

### parse(format[, options])

Returns a function that creates a parser stream. Parser streams receive text as input, and output objects.

#### format

Built in parsers are:

- csv
  - Optional `autoFormat` option, to automatically infer types of values and convert them.
  - Optional `camelcase` option, to camelcase and normalize header keys.
  - Optional `zip` option, if the content is a zip file it will parse each CSV file in the zip.
- excel
  - Optional `autoFormat` option, to automatically infer types of values and convert them.
  - Optional `camelcase` option, to camelcase and normalize header keys.
  - Optional `zip` option, if the content is a zip file it will parse each XLSX file in the zip.
- json
  - Requires a `selector` option that specifies where to grab rows in the data.
    - If needed, you may provide multiple selectors as an array (`selector: [ 'a.*', 'b.*' ]`)
  - Optional `zip` option, if the content is a zip file it will parse each JSON file in the zip.
- xml
  - Requires a `selector` option that specifies where to grab rows in the data.
    - Note that the selector applies to the [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js) output.
  - Optional `autoFormat` option, to automatically infer types of values and convert them.
  - Optional `camelcase` option, to camelcase and normalize header keys.
  - Optional `zip` option, if the content is a zip file it will parse each XML file in the zip.
- ndjson
- shp
- kml
- kmz
- gdb
- gpx
- gtfs
- gtfsrt

### options

- Optional `autoFormat` option, to automatically infer types of values and convert them.
  - If `simple` it will only infer types from values and trim keys
  - If `aggressive` it will add camelcasing of keys on top of simple mode
  - If `extreme` it will add more complex mapping on top of aggressive mode
    - For example, converting `startLat` and `startLon` fields to a GeoJSON Point

### transform(transformer[, options])

#### transformer(row, meta)

- Asynchronous function, receives the current row and the meta information object.
- If transformer is a string, it will compile it and sandbox it using [vm2](https://github.com/patriksimek/vm2).
- If transformer is an object, it will use [object-transform-stack](https://github.com/staeco/object-transform-stack) to map objects.
- Returning an object will pass it on, and null or undefined will remove the item from the stream (skip).

#### options

- sandbox - Optional `Object`
  - Creates a frozen global context, used for sandboxed transformers
  - Only applies when using a string transformer
- timeout - Optional `Number`
  - Only applies when using a string transformer
- compiler - Optional `Function`
  - Only applies when using a string transformer
- concurrency - Optional `Number`, defaults to 10
- onBegin(row, meta) - Optional `Function`
- onError(err, row, meta) - Optional `Function`
- onSkip(row, meta) - Optional `Function`
- onSuccess(row, meta) - Optional `Function`

### tap(fn[, options])

#### fn(row, meta)

- Asynchronous function, receives the current row and the meta information object.
- Returning an object will pass it on, and null or undefined will remove the item from the stream.

#### options

- concurrency - Optional `Number`, defaults to 10

### normalize([options])

Returns the plain objects without any meta fields attached, useful for the end of a stream.

#### options

- concurrency - Optional `Number`, defaults to 10

[downloads-image]: http://img.shields.io/npm/dm/vandelay.svg
[npm-url]: https://npmjs.org/package/vandelay
[npm-image]: http://img.shields.io/npm/v/vandelay.svg

[travis-url]: https://travis-ci.org/staeco/vandelay
[travis-image]: https://travis-ci.org/staeco/vandelay.png?branch=master

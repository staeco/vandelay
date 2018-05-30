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

#### source

- url - Required `String`
- parser - Required `Function`
- pagination - Optional `Object`
  - offsetParam - Required `String` (if not using pageParam)
  - pageParam - Required `String` (if not using offsetParam)
  - limitParam - Required `String`
  - startPage - Optional `Number`, defaults to 0
  - limit - Required `Number`

#### options

- modifyRequest - Optional `Function`
  - Receives a superagent request object prior to execution, so you can add on any additional headers/querystring parameters.

### parse(format[, options])

Returns a function that creates a parser stream. Parser streams receive text as input, and output objects.

#### format

Built in parsers are:

- csv
  - Optional `autoParse` option, to automatically infer types of values and convert them.
  - Optional `camelcase` option, to camelcase and normalize header keys.
- excel
  - Optional `autoParse` option, to automatically infer types of values and convert them.
  - Optional `camelcase` option, to camelcase and normalize header keys.
- shp
- json
  - Requires a `selector` option that specifies where to grab rows in the data.
- xml
  - Requires a `selector` option that specifies where to grab rows in the data.
    - Note that the selector applies to the [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js) output.
  - Optional `autoParse` option, to automatically infer types of values and convert them.
  - Optional `camelcase` option, to camelcase and normalize header keys.

### transform(transformer[, options])

#### transformer(row, meta)

- Asynchronous function, receives the current row and the meta information object.
- If transformer is a string, it will compile it and sandbox it using [vm2](https://github.com/patriksimek/vm2).
- Returning an object will pass it on, and null or undefined will remove the item from the stream (skip).

#### options

- sandbox - Optional `Object`
  - Creates a frozen global context, used for sandboxed transformers
  - Only applies when using a string transformer
- timeout - Optional `Number`
  - Only applies when using a string transformer
- compiler - Optional `Function`
  - Only applies when using a string transformer
- concurrency - Optional `Number`, defaults to 50
- onBegin(row, meta) - Optional `Function`
- onError(err, row, meta) - Optional `Function`
- onSkip(row, meta) - Optional `Function`
- onSuccess(row, meta) - Optional `Function`

### tap(fn[, options])

#### fn(row, meta)

- Asynchronous function, receives the current row and the meta information object.
- Returning an object will pass it on, and null or undefined will remove the item from the stream.

#### options

- concurrency - Optional `Number`, defaults to 50

[downloads-image]: http://img.shields.io/npm/dm/vandelay.svg
[npm-url]: https://npmjs.org/package/vandelay
[npm-image]: http://img.shields.io/npm/v/vandelay.svg

[travis-url]: https://travis-ci.org/contra/vandelay
[travis-image]: https://travis-ci.org/contra/vandelay.png?branch=master

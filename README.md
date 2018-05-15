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
import van from 'vandelay'
import bs from 'bluestream'

van.fetch({
  url: 'http://google.com/example.geojson',
  parser: van.parse('geojson')
})
  .pipe(van.transform(async (row) => {
    const external = await otherApi(row.field)
    return {
      ...row,
      external
    }
  }))
  .pipe(bs.transform({ concurrent: 100 }, async (row) => {
    // send row to an external api, db, or whatever!
  }))
```

## Example - API

```js
import van from 'vandelay'
import bs from 'bluestream'

van.fetch({
  url: 'http://google.com/api/example',
  parser: van.parse('json', { selector: 'results.*' }),
  pagination: {
    offsetParam: 'offset',
    limitParam: 'limit'
  }
})
  .pipe(van.transform(async (row) => {
    const external = await otherApi(row.field)
    return {
      ...row,
      external
    }
  }))
  .pipe(bs.transform({ concurrent: 100 }, async (row) => {
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
- concurrency - Optional `Number`, defaults to 50

### parse(format[, options])

Returns a function that creates a parser stream. Parser streams receive text as input, and output objects.

#### format

Built in parsers are:

- csv
  - Optional `autoParse` option, to automatically infer types of values and convert them.
- excel
  - Optional `autoParse` option, to automatically infer types of values and convert them.
- json
  - Requires a `selector` option that specifies where to grab rows in the data.
- geojson
- xml
  - Requires a `selector` option that specifies where to grab rows in the data.
    - Note that the selector applies to the [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js) output.

### transform(transformer[, options])

#### transformer


#### options

- concurrency - Optional `Number`, defaults to 50

[downloads-image]: http://img.shields.io/npm/dm/vandelay.svg
[npm-url]: https://npmjs.org/package/vandelay
[npm-image]: http://img.shields.io/npm/v/vandelay.svg

[travis-url]: https://travis-ci.org/contra/vandelay
[travis-image]: https://travis-ci.org/contra/vandelay.png?branch=master

/*eslint no-console: 0, no-loops/no-loops: "off" */
/* eslint */

import should from 'should'
import collect from 'get-stream'
import express from 'express'
import getPort from 'get-port'
import parseRange from 'range-parser'
import parseBody from 'body-parser'
import through2 from 'through2'
import compile from 'vandelay-es6'
import { createHash } from 'crypto'
import mergeURL from '../../src/mergeURL'
import tap from '../../src/tap'
import fetch from '../../src/fetch'
import parse from '../../src/parse'

let port, app, server
const sample = [
  { a: 1, b: 2, c: 3 },
  { a: 4, b: 5, c: 6 },
  { a: 7, b: 8, c: 9 }
]

const SHP_FILE = 'http://www.longbeach.gov/ti/media-library/documents/gis/data-catalog/bikeways/'

// ArcGIS does not handle range headers, so this is good to test. This is Jefferson County Speed Limits.
const ARCGIS_URL = 'https://opendata.arcgis.com/datasets/f36b2c8164714b258840dce66909ba9a_1.geojson'

// Socrata does support range but error-prone, so this is good to test. This is NYC BIS Property Data.
const SOCRATA_URL = 'https://data.cityofnewyork.us/api/views/kmub-vria/rows.csv?accessType=DOWNLOAD'

const md5 = (txt) => createHash('md5').update(String(txt)).digest('hex')

describe('fetch', () => {
  before(async () => {
    port = await getPort()
    app = express()
    app.use(parseBody.urlencoded({ extended: true }))
    app.post('/token', (req, res) => {
      if (req.body.grant_type !== 'password' || req.body.username !== 'root' || req.body.password !== 'admin') {
        return res.status(401).send('401').end()
      }
      res.json({ access_token: 'abc' })
    })
    app.get('/secure-api', (req, res) => {
      if (req.headers.authorization !== 'Bearer abc') {
        return res.status(401).send('401').end()
      }
      res.json({ data: sample })
    })
    app.get('/check-headers', (req, res) => {
      if (req.headers.a !== 'abc') return res.status(500).send('500').end()
      res.json({ data: sample })
    })
    // this endpoint does page 1 - 5, and has a pageKey required for pages above 1
    app.get('/linked-page-api', (req, res) => {
      const page = req.query.page && parseInt(req.query.page)
      if (!page) return res.status(500).send('Missing page!').end()
      if (page > 5) return res.json({ data: [], links: { next: null } })
      if (page !== 1 && md5(page) !== req.query.pageKey) return res.status(401).send('Bad page key!').end()

      const nextPage = page + 1
      const nextURL = mergeURL(req.url, { page: nextPage, pageKey: md5(nextPage) })
      res.json({
        data: page === 3 ? [] : sample, // page 3 has no data to emulate real API behavior
        links: {
          next: nextURL
        }
      })
    })
    app.get('/slow-file.json', (req, res) => {
      setTimeout(() => {
        res.json({ data: sample })
      }, 5000)
    })
    app.get('/file.json', (req, res) => {
      res.json({ data: sample })
    })
    app.get('/404.json', (req, res) => {
      res.status(404).send('404').end()
    })
    app.get('/500.json', (req, res) => {
      res.status(500).send('500').end()
    })
    app.get('/429.json', (req, res) => {
      res.status(429).send('429').end()
    })
    app.get('/bad.json', (req, res) => {
      res.status(200).send('{ "a": [ { "b": 1 }, { zzzzz').end()
    })
    app.get('/data', (req, res) => {
      const { offset, limit } = req.query
      const end = parseInt(offset) + parseInt(limit)
      const data = sample.slice(offset, Math.min(sample.length, end))
      res.json({ data })
    })
    app.get('/infinite', (req, res) => {
      const close = req.query.close && parseInt(req.query.close)
      const endIdx = close ? close - 1 : Infinity
      const end = () => {
        res.write(JSON.stringify({ a: Math.random() }))
        res.write(']')
        res.end()
      }

      res.write('[')
      for (let i = 0; i < endIdx; ++i) {
        res.write(`${JSON.stringify({ a: Math.random() })},`)
      }
      end()
    })
    app.get('/ranges', (req, res) => {
      // prep
      const close = req.query.close && parseInt(req.query.close)
      const max = req.query.max && parseInt(req.query.max)
      const arr = []
      for (let i = 0; i < max; ++i) {
        arr.push({ a: 1 })
      }
      const text = Buffer.from(JSON.stringify(arr))
      const range = req.headers.range && parseRange(text.length, req.headers.range)[0]

      // do the work
      res.set('Accept-Ranges', 'bytes')

      if (range) {
        const toSend = text.slice(range.start, range.end + 1)
        res.status(206)
        res.set('Content-Length', toSend.length)
        res.set('Content-Range', `bytes ${range.start}-${range.end}/${text.length}`)
        res.write(toSend.slice(0, close))
      } else {
        res.status(200)
        res.set('Content-Length', text.length)
        res.write(text.slice(0, close))
      }
      res.end()
    })
    server = app.listen(port)
  })
  after((cb) => server.close(cb))
  it('should throw in invalid options', async () => {
    should.throws(() => fetch(null))
    should.throws(() => fetch(1))
    should.throws(() => fetch({ url: 1 }))
    should.throws(() => fetch({ url: '', parser: () => {} }))
    should.throws(() => fetch({ url: '', parser: '' }))
  })
  it('should request a flat json file', async () => {
    const source = {
      url: `http://localhost:${port}/file.json`,
      parser: parse('json', { selector: 'data.*' })
    }
    const stream = fetch(source)
    stream.url().should.equal(source.url)
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: source.url, source } },
      { a: 4, b: 5, c: 6, ___meta: { row: 1, url: source.url, source } },
      { a: 7, b: 8, c: 9, ___meta: { row: 2, url: source.url, source } }
    ])
  })
  it('should request a flat arcgis geojson file that gets interrupted', async () => {
    const source = {
      url: ARCGIS_URL,
      parser: parse('json', { selector: 'features.*' })
    }
    const stream = fetch(source, {
      attempts: 2
    })
    stream.url().should.equal(source.url)
    let gotRes = false
    stream.running[0].req.once('response', (res) => {
      should.exist(res)
      gotRes = true
      setTimeout(() => {
        // simulate a failure at a low level about 1s into the request
        res.emit('error', new Error('Fake!'))
      }, 1000)
    })
    const res = await collect.array(stream)
    res.length.should.eql(34289)
    res[0].___meta.should.eql({
      header: {
        name: 'Jefferson_County_KY_Street_Centerlines',
        type: 'FeatureCollection',
        crs: {
          type: 'name',
          properties: {
            name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
          }
        }
      },
      row: 0,
      url: source.url,
      source
    })
    should.exist(res[0].geometry)
    should(gotRes).equal(true)
  })
  it('should request a arcgis geojson file with light backpressure', async () => {
    const source = {
      url: ARCGIS_URL,
      parser: parse('json', { selector: 'features.*' })
    }
    const stream = fetch(source)
    stream.url().should.equal(source.url)

    // create a slow stream that takes 100ms per item
    const pressure = tap(async (data) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return data
    }, { concurrency: 64 })

    const res = await collect.array(stream.pipe(pressure))
    res.length.should.eql(34289)
    res[0].___meta.should.eql({
      header: {
        name: 'Jefferson_County_KY_Street_Centerlines',
        type: 'FeatureCollection',
        crs: {
          type: 'name',
          properties: {
            name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
          }
        }
      },
      row: 0,
      url: source.url,
      source
    })
    should.exist(res[0].geometry)
  })
  it('should request a socrata csv file that gets interrupted', async () => {
    const source = {
      url: SOCRATA_URL,
      parser: parse('csv')
    }
    const stream = fetch(source, {
      attempts: 2
    })
    stream.url().should.equal(source.url)
    let gotRes = false
    stream.running[0].req.once('response', (res) => {
      should.exist(res)
      gotRes = true
      setTimeout(() => {
        // simulate a failure at a low level about 1s into the request
        res.socket.destroy(new Error('Fake!'))
      }, 100)
    })
    const res = await collect.array(stream)
    res.length.should.eql(77)
    should(gotRes).equal(true)
  })
  it('should request a flat json file with context', async () => {
    const expectedURL = `http://localhost:${port}/file.json`
    const context = { fileName: 'file' }
    const source = {
      url: `http://localhost:${port}/{fileName}.json`,
      parser: parse('json', { selector: 'data.*' })
    }
    const stream = fetch(source, { context })
    stream.url().should.equal(`http://localhost:${port}/${context.fileName}.json`)
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: expectedURL, source, context } },
      { a: 4, b: 5, c: 6, ___meta: { row: 1, url: expectedURL, source, context } },
      { a: 7, b: 8, c: 9, ___meta: { row: 2, url: expectedURL, source, context } }
    ])
  })
  it('should respect timeouts', async () => {
    const source = {
      url: `http://localhost:${port}/slow-file.json`,
      parser: parse('json', { selector: 'data.*' })
    }
    const stream = fetch(source, {
      timeout: 10,
      attempts: 1
    })
    try {
      await collect.array(stream)
    } catch (err) {
      should(err.code).equal('ETIMEDOUT')
      should(err.requestError).equal(true)
      should.exist(err.source)
      should.exist(err.url)
      return
    }
    throw new Error('Did not timeout!')
  })
  it('should respect timeouts with multiple files, slow first', async () => {
    const source = {
      url: `http://localhost:${port}/slow-file.json`,
      parser: parse('json', { selector: 'data.*' })
    }
    const source2 = {
      url: `http://localhost:${port}/file.json`,
      parser: parse('json', { selector: 'data.*' })
    }
    const stream = fetch([ source, source2 ], {
      timeout: 100,
      attempts: 1,
      onError: ({ error, canContinue, fatal }) => {
        should(error.code).equal('ETIMEDOUT')
        should(error.requestError).equal(true)
        should.exist(error.source)
        should.exist(error.url)
        canContinue.should.equal(false)
        fatal.should.equal(false)
      }
    })
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: source2.url, source: source2 } },
      { a: 4, b: 5, c: 6, ___meta: { row: 1, url: source2.url, source: source2 } },
      { a: 7, b: 8, c: 9, ___meta: { row: 2, url: source2.url, source: source2 } }
    ])
  })
  it('should respect timeouts with multiple files, slow last', async () => {
    const source = {
      url: `http://localhost:${port}/slow-file.json`,
      parser: parse('json', { selector: 'data.*' })
    }
    const source2 = {
      url: `http://localhost:${port}/file.json`,
      parser: parse('json', { selector: 'data.*' })
    }
    const stream = fetch([ source2, source ], {
      timeout: 100,
      attempts: 1,
      onError: ({ error, canContinue, fatal }) => {
        should(error.code).equal('ETIMEDOUT')
        should(error.requestError).equal(true)
        should.exist(error.source)
        should.exist(error.url)
        canContinue.should.equal(false)
        fatal.should.equal(false)
      }
    })
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: source2.url, source: source2 } },
      { a: 4, b: 5, c: 6, ___meta: { row: 1, url: source2.url, source: source2 } },
      { a: 7, b: 8, c: 9, ___meta: { row: 2, url: source2.url, source: source2 } }
    ])
  })
  it('should work with custom fetchURL', async () => {
    const expectedURL = `http://localhost:${port}/file.json`
    const context = { fileName: 'file' }
    const source = {
      url: `http://localhost:${port}/{fileName}.json`,
      parser: parse('json', { selector: 'data.*' })
    }
    const stream = fetch(source, {
      fetchURL: (url, opt) => {
        should.exist(url)
        should.exist(opt)
        const stream = through2.obj()
        stream.write(JSON.stringify({ data: sample }))
        stream.url = expectedURL
        process.nextTick(() => stream.end())
        return stream
      },
      context
    })
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: expectedURL, source, context } },
      { a: 4, b: 5, c: 6, ___meta: { row: 1, url: expectedURL, source, context } },
      { a: 7, b: 8, c: 9, ___meta: { row: 2, url: expectedURL, source, context } }
    ])
  })
  it('should request a flat json file with headers', async () => {
    const source = {
      url: `http://localhost:${port}/file.json`,
      headers: {
        a: 'abc'
      },
      parser: parse('json', { selector: 'data.*' })
    }
    const stream = fetch(source)
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: source.url, source } },
      { a: 4, b: 5, c: 6, ___meta: { row: 1, url: source.url, source } },
      { a: 7, b: 8, c: 9, ___meta: { row: 2, url: source.url, source } }
    ])
  })
  it('should request a flat json file and ignore invalid headers', async () => {
    const source = {
      url: `http://localhost:${port}/file.json`,
      headers: {
        '': 'abc',
        yo: '',
        ' ': ''
      },
      parser: parse('json', { selector: 'data.*' })
    }
    const stream = fetch(source)
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: source.url, source } },
      { a: 4, b: 5, c: 6, ___meta: { row: 1, url: source.url, source } },
      { a: 7, b: 8, c: 9, ___meta: { row: 2, url: source.url, source } }
    ])
  })
  it('should request a flat json file with setup function', async () => {
    const source = {
      url: `http://localhost:${port}/secure-api`,
      setup: async (source) => {
        should.exist(source)
        return { query: { a: '123' }, accessToken: 'abc' }
      },
      parser: parse('json', { selector: 'data.*' })
    }
    const fullURL = `${source.url}?a=123`
    const stream = fetch(source)
    const res = await collect.array(stream)
    stream.url().should.eql(fullURL)
    res.should.eql([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: fullURL, source, accessToken: 'abc' } },
      { a: 4, b: 5, c: 6, ___meta: { row: 1, url: fullURL, source, accessToken: 'abc' } },
      { a: 7, b: 8, c: 9, ___meta: { row: 2, url: fullURL, source, accessToken: 'abc' } }
    ])
  })
  it('should request a flat json file with text setup function', async () => {
    const source = {
      url: `http://localhost:${port}/secure-api`,
      setup: `module.exports = async () => ({ accessToken: 'abc' })`,
      parser: parse('json', { selector: 'data.*' })
    }
    const stream = fetch(source)
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: source.url, source, accessToken: 'abc' } },
      { a: 4, b: 5, c: 6, ___meta: { row: 1, url: source.url, source, accessToken: 'abc' } },
      { a: 7, b: 8, c: 9, ___meta: { row: 2, url: source.url, source, accessToken: 'abc' } }
    ])
  })
  it('should request a flat json file with ES7 setup function', async () => {
    const source = {
      url: `http://localhost:${port}/secure-api`,
      setup: `export default async () => ({ accessToken: 'abc' })`,
      parser: parse('json', { selector: 'data.*' })
    }
    const stream = fetch(source, { setup: { compiler: compile } })
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: source.url, source, accessToken: 'abc' } },
      { a: 4, b: 5, c: 6, ___meta: { row: 1, url: source.url, source, accessToken: 'abc' } },
      { a: 7, b: 8, c: 9, ___meta: { row: 2, url: source.url, source, accessToken: 'abc' } }
    ])
  })
  it('should request a flat json file with setup function and context', async () => {
    const context = { test: 'abc123' }
    const source = {
      url: `http://localhost:${port}/secure-api`,
      setup: async (source, meta) => {
        should.exist(source)
        should.exist(meta)
        should.exist(meta.context)
        should(meta.context).eql(context)
        return { accessToken: 'abc' }
      },
      parser: parse('json', { selector: 'data.*' })
    }
    const stream = fetch(source, { context })
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: source.url, source, context, accessToken: 'abc' } },
      { a: 4, b: 5, c: 6, ___meta: { row: 1, url: source.url, source, context, accessToken: 'abc' } },
      { a: 7, b: 8, c: 9, ___meta: { row: 2, url: source.url, source, context, accessToken: 'abc' } }
    ])
  })
  it('should request a flat json file with oauth', async () => {
    const source = {
      url: `http://localhost:${port}/secure-api`,
      oauth: {
        grant: {
          url: `http://localhost:${port}/token`,
          type: 'password',
          username: 'root',
          password: 'admin'
        }
      },
      parser: parse('json', { selector: 'data.*' })
    }
    const stream = fetch(source)
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: source.url, source, accessToken: 'abc' } },
      { a: 4, b: 5, c: 6, ___meta: { row: 1, url: source.url, source, accessToken: 'abc' } },
      { a: 7, b: 8, c: 9, ___meta: { row: 2, url: source.url, source, accessToken: 'abc' } }
    ])
  })
  it('should end stream as needed with oauth', async () => {
    const max = 1
    let curr = 0
    const source = {
      url: `http://localhost:${port}/secure-api`,
      oauth: {
        grant: {
          url: `http://localhost:${port}/token`,
          type: 'password',
          username: 'root',
          password: 'admin'
        }
      },
      parser: parse('json', { selector: 'data.*' })
    }
    const stream = fetch(source)
    stream.on('data', () => {
      ++curr
      if (curr >= max) stream.abort()
    })
    const res = await collect.array(stream)
    res.length.should.equal(max)
  })
  it('should blow up correctly with invalid oauth', (done) => {
    const source = {
      url: `http://localhost:${port}/secure-api`,
      oauth: {
        grant: {
          url: `http://localhost:${port}/token`,
          type: 'password',
          username: 'root',
          password: 'not the right password'
        }
      },
      parser: parse('json', { selector: 'data.*' })
    }
    const stream = fetch(source)
    stream.once('error', (err) => {
      should.exist(err)
      should.exist(err.status)
      err.status.should.equal(401)
      should.exist(err.message)
      err.message.should.equal('Server responded with "Unauthorized"')
      should.exist(err.body)
      err.body.should.equal('401')
      should.not.exist(err.code)
      done()
    })
  })
  it('should work with declarative parser', async () => {
    const source = {
      url: `http://localhost:${port}/file.json`,
      parser: 'json',
      parserOptions: { selector: 'data.*' }
    }
    const stream = fetch(source)
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: source.url, source } },
      { a: 4, b: 5, c: 6, ___meta: { row: 1, url: source.url, source } },
      { a: 7, b: 8, c: 9, ___meta: { row: 2, url: source.url, source } }
    ])
  })
  it('should work with multiple sources', async () => {
    const source = {
      url: `http://localhost:${port}/file.json`,
      parser: parse('json', { selector: 'data.*' })
    }
    const stream = fetch([ source, source ])
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: source.url, source } },
      { a: 4, b: 5, c: 6, ___meta: { row: 1, url: source.url, source } },
      { a: 7, b: 8, c: 9, ___meta: { row: 2, url: source.url, source } },
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: source.url, source } },
      { a: 4, b: 5, c: 6, ___meta: { row: 1, url: source.url, source } },
      { a: 7, b: 8, c: 9, ___meta: { row: 2, url: source.url, source } }
    ])
  })
  it('should request with selector pagination', async () => {
    const source = {
      url: `http://localhost:${port}/linked-page-api`,
      parser: 'json',
      parserOptions: {
        selector: 'data.*'
      },
      pagination: {
        pageParam: 'page',
        startPage: 1,
        nextPageSelector: 'links.next'
      }
    }
    const stream = fetch(source)
    stream.url().should.equal(`${source.url}?page=1`)
    const res = await collect.array(stream)
    should(res.length).equal(12)
  })
  it('should request with selector pagination and concurrency 1', async () => {
    const source = {
      url: `http://localhost:${port}/linked-page-api`,
      parser: 'json',
      parserOptions: {
        selector: 'data.*'
      },
      pagination: {
        pageParam: 'page',
        startPage: 1,
        nextPageSelector: 'links.next'
      }
    }
    const stream = fetch(source, { concurrency: 1 })
    stream.url().should.equal(`${source.url}?page=1`)
    const res = await collect.array(stream)
    should(res.length).equal(12)
  })
  it('should request with pagination', async () => {
    const source = {
      url: `http://localhost:${port}/data`,
      parser: parse('json', { selector: 'data.*' }),
      pagination: {
        limitParam: 'limit',
        offsetParam: 'offset',
        limit: 1
      }
    }
    const stream = fetch(source)
    stream.url().should.equal(`${source.url}?limit=1&offset=0`)
    const res = await collect.array(stream)
    res.should.containDeep([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: `${source.url}?limit=1&offset=0`, source } },
      { a: 4, b: 5, c: 6, ___meta: { row: 0, url: `${source.url}?limit=1&offset=1`, source } },
      { a: 7, b: 8, c: 9, ___meta: { row: 0, url: `${source.url}?limit=1&offset=2`, source } }
    ])
  })
  it('should request with pagination and concurrency 1', async () => {
    const source = {
      url: `http://localhost:${port}/data`,
      parser: parse('json', { selector: 'data.*' }),
      pagination: {
        limitParam: 'limit',
        offsetParam: 'offset',
        limit: 1
      }
    }
    const stream = fetch(source, { concurrency: 1 })
    stream.url().should.equal(`${source.url}?limit=1&offset=0`)
    const res = await collect.array(stream)
    res.should.containDeep([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: `${source.url}?limit=1&offset=0`, source } },
      { a: 4, b: 5, c: 6, ___meta: { row: 0, url: `${source.url}?limit=1&offset=1`, source } },
      { a: 7, b: 8, c: 9, ___meta: { row: 0, url: `${source.url}?limit=1&offset=2`, source } }
    ])
  })
  it('should request with pagination and context', async () => {
    const context = { path: 'data' }
    const source = {
      url: `http://localhost:${port}/{path}`,
      parser: parse('json', { selector: 'data.*' }),
      pagination: {
        limitParam: 'limit',
        offsetParam: 'offset',
        limit: 1
      }
    }
    const stream = fetch(source, { context })
    stream.url().should.equal(`http://localhost:${port}/${context.path}?limit=1&offset=0`)
    const res = await collect.array(stream)
    res.should.containDeep([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: `http://localhost:${port}/data?limit=1&offset=0`, source } },
      { a: 4, b: 5, c: 6, ___meta: { row: 0, url: `http://localhost:${port}/data?limit=1&offset=1`, source } },
      { a: 7, b: 8, c: 9, ___meta: { row: 0, url: `http://localhost:${port}/data?limit=1&offset=2`, source } }
    ])
  })
  it('should work with non-object selector', async () => {
    const source = {
      url: `http://localhost:${port}/file.json`,
      parser: 'json',
      parserOptions: { selector: 'data.*.a' }
    }
    const stream = fetch(source)
    const res = await collect.array(stream)
    res.should.eql([ 1, 4, 7 ])
  })
  it('should handle backpressure correctly with a single stream', async () => {
    const max = 10000
    const source = {
      url: `http://localhost:${port}/infinite?close=10000`,
      parser: 'json',
      parserOptions: { selector: '*.a' }
    }
    const stream = fetch(source)
    await new Promise((resolve) => setTimeout(resolve, 1000)) // wait 1s before reading
    const res = await collect.array(stream)
    res.length.should.equal(max)
  })
  it('should handle backpressure correctly with a multi stream', async () => {
    const max = 30000
    const source = [
      {
        url: `http://localhost:${port}/infinite?close=10000`,
        parser: 'json',
        parserOptions: { selector: '*.a' }
      },
      {
        url: `http://localhost:${port}/infinite?close=10000`,
        parser: 'json',
        parserOptions: { selector: '*.a' }
      },
      {
        url: `http://localhost:${port}/infinite?close=10000`,
        parser: 'json',
        parserOptions: { selector: '*.a' }
      }
    ]
    const stream = fetch(source)
    await new Promise((resolve) => setTimeout(resolve, 1000)) // wait 1s before reading
    const res = await collect.array(stream)
    res.length.should.equal(max)
  })
  it('should end stream as needed', async () => {
    const max = 10
    let curr = 0
    const source = {
      url: `http://localhost:${port}/infinite?close=10000`,
      parser: 'json',
      parserOptions: { selector: '*.a' }
    }
    const stream = fetch(source)
    stream.on('data', () => {
      ++curr
      if (curr >= max) stream.abort()
    })
    const res = await collect.array(stream)
    res.length.should.equal(max)
  })
  it('should end stream as needed with real data', async () => {
    const max = 100000
    let curr = 0
    const source = {
      url: 'https://storage.googleapis.com/staeco-data-files/citibike/2018-01-through-10.csv',
      parser: 'csv'
    }
    const stream = fetch(source)
    stream.on('data', () => {
      ++curr
      if (curr >= max) stream.abort()
    })
    const res = await collect.array(stream)
    res.length.should.equal(max)
  })
  it('should end stream as needed with pagination', async () => {
    const max = 10
    let curr = 0
    const source = {
      url: `http://localhost:${port}/infinite?close=10000`,
      pagination: {
        limitParam: 'limit',
        offsetParam: 'offset',
        limit: 1
      },
      parser: 'json',
      parserOptions: { selector: '*.a' }
    }
    const stream = fetch(source)
    stream.on('data', () => {
      ++curr
      if (curr >= max) stream.abort()
    })
    const res = await collect.array(stream)
    res.length.should.equal(max)
  })
  it('should handle stream closes properly, and continue when supported', async () => {
    const max = 1000
    const source = {
      // will close the stream every 4kb, and support ranges
      url: `http://localhost:${port}/ranges?close=4096&max=${max}`,
      parser: 'json',
      parserOptions: { selector: '*.a' }
    }
    const stream = fetch(source)
    const res = await collect.array(stream)
    res.length.should.equal(max)
  })
  it('should handle stream closes properly, and not continue when not supported', async () => {
    const source = {
      // will close the stream after 1000 items
      url: `http://localhost:${port}/infinite?close=10000`,
      parser: 'json',
      parserOptions: { selector: '*.a' }
    }
    const stream = fetch(source)
    const res = await collect.array(stream)
    res.length.should.equal(10000)
  })
  it('should emit 404 http errors', (done) => {
    const stream = fetch({
      url: `http://localhost:${port}/404.json`,
      parser: parse('json', { selector: 'data.*' })
    })
    stream.once('error', (err) => {
      should.exist(err)
      should.exist(err.status)
      err.status.should.equal(404)
      should.exist(err.message)
      err.message.should.equal('Server responded with "Not Found"')
      should.exist(err.body)
      err.body.should.equal('404')
      should.not.exist(err.code)
      done()
    })
  })
  it('should emit not found errors', (done) => {
    const stream = fetch({
      url: 'http://this-domain-does-not-exist.io/connfailed.csv',
      parser: parse('json', { selector: 'data.*' })
    })
    stream.once('error', (err) => {
      should.exist(err)
      err.message.should.equal('Failed to resolve server host')
      err.code.should.equal('ENOTFOUND')
      should.not.exist(err.status)
      should.not.exist(err.body)
      done()
    })
  })
  it('should emit 500 http errors', (done) => {
    const stream = fetch({
      url: `http://localhost:${port}/500.json`,
      parser: parse('json', { selector: 'data.*' })
    }, { attempts: 1 })
    stream.once('error', (err) => {
      should.exist(err)
      should.exist(err.status)
      err.status.should.equal(500)
      err.message.should.equal('Server responded with "Internal Server Error"')
      err.body.should.equal('500')
      should.not.exist(err.code)
      done()
    })
  })
  it('should allow handling via onError', (done) => {
    fetch({
      url: `http://localhost:${port}/500.json`,
      parser: parse('json', { selector: 'data.*' })
    }, {
      attempts: 1,
      onError: ({ error, canContinue }) => {
        should.exist(error)
        error.status.should.equal(500)
        error.message.should.equal('Server responded with "Internal Server Error"')
        error.body.should.equal('500')
        should.not.exist(error.code)
        should.equal(canContinue, false)
        done()
      }
    })
  })
  it('should emit 429 http errors', (done) => {
    const stream = fetch({
      url: `http://localhost:${port}/429.json`,
      parser: parse('json', { selector: 'data.*' })
    }, { attempts: 1 })
    stream.once('error', (err) => {
      should.exist(err)
      should.exist(err.status)
      err.status.should.equal(429)
      err.message.should.equal('Server responded with "Too Many Requests"')
      err.body.should.equal('429')
      should.not.exist(err.code)
      done()
    })
  })
  it('should emit 429 http errors with pagination', (done) => {
    const stream = fetch({
      url: `http://localhost:${port}/429.json`,
      parser: parse('json', { selector: 'data.*' }),
      pagination: {
        limitParam: 'limit',
        offsetParam: 'offset',
        limit: 1
      }
    }, { attempts: 1 })
    stream.once('error', (err) => {
      should.exist(err)
      should.exist(err.status)
      err.status.should.equal(429)
      err.message.should.equal('Server responded with "Too Many Requests"')
      err.body.should.equal('429')
      should.not.exist(err.code)
      done()
    })
  })
  it('should allow continuing via onError', (done) => {
    fetch([
      {
        url: `http://localhost:${port}/500.json`,
        parser: parse('json', { selector: 'data.*' })
      },
      {
        url: `http://localhost:${port}/infinite?close=10000`,
        parser: 'json',
        parserOptions: { selector: '*.a' }
      }
    ], {
      attempts: 1,
      onError: ({ error, canContinue }) => {
        should.exist(error)
        error.status.should.equal(500)
        error.message.should.equal('Server responded with "Internal Server Error"')
        error.body.should.equal('500')
        should.not.exist(error.code)
        should.equal(canContinue, true)
        done()
      }
    })
  })
  it('should allow continuing via onError with single concurrency', (done) => {
    fetch([
      {
        url: `http://localhost:${port}/500.json`,
        parser: parse('json', { selector: 'data.*' })
      },
      {
        url: `http://localhost:${port}/infinite?close=10000`,
        parser: 'json',
        parserOptions: { selector: '*.a' }
      }
    ], {
      attempts: 1,
      concurrency: 1,
      onError: ({ error, canContinue }) => {
        should.exist(error)
        error.status.should.equal(500)
        error.message.should.equal('Server responded with "Internal Server Error"')
        error.body.should.equal('500')
        should.not.exist(error.code)
        should.equal(canContinue, true)
        done()
      }
    })
  })
  it('should error on invalid object', (done) => {
    const stream = fetch({
      url: `http://localhost:${port}/bad.json`,
      parser: parse('json', { selector: 'a.*' })
    })
    stream.once('data', (c) => {
      c.b.should.equal(1)
    })
    stream.once('error', (err) => {
      should.exist(err)
      done()
    })
  })
  it('should work with a shapefile', async () => {
    const stream = fetch({
      url: SHP_FILE,
      parser: 'shp'
    })
    const res = await collect.array(stream)
    should.exist(res[0].properties.NAME)
  })
})

/*eslint no-console: 0*/

import should from 'should'
import collect from 'get-stream'
import express from 'express'
import getPort from 'get-port'
import parseRange from 'range-parser'
import parseBody from 'body-parser'
import fetch from '../../src/fetch'
import parse from '../../src/parse'

let port, app, server
const sample = [
  { a: 1, b: 2, c: 3 },
  { a: 4, b: 5, c: 6 },
  { a: 7, b: 8, c: 9 }
]

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
    app.get('/file.json', (req, res) => {
      res.json({ data: sample })
    })
    app.get('/404.json', (req, res) => {
      res.status(404).send('404').end()
    })
    app.get('/500.json', (req, res) => {
      res.status(500).send('500').end()
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
      res.write('[')
      for (let i = 0; i < Infinity; ++i) {
        if (close && i >= close) return res.end()
        res.write(`${JSON.stringify({ a: Math.random() })},`)
      }
      res.write(JSON.stringify({ a: Math.random() }))
      res.write(']')
      res.end()
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
        //console.log('using ranges', `bytes ${range.start}-${range.end}/${text.length}`)
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
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: source.url, source } },
      { a: 4, b: 5, c: 6, ___meta: { row: 1, url: source.url, source } },
      { a: 7, b: 8, c: 9, ___meta: { row: 2, url: source.url, source } }
    ])
  })
  it('should request a flat json file with context', async () => {
    const expectedURL = `http://localhost:${port}/file.json`
    const source = {
      url: `http://localhost:${port}/{fileName}.json`,
      parser: parse('json', { selector: 'data.*' })
    }
    const stream = fetch(source, { context: { fileName: 'file' } })
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: expectedURL, source } },
      { a: 4, b: 5, c: 6, ___meta: { row: 1, url: expectedURL, source } },
      { a: 7, b: 8, c: 9, ___meta: { row: 2, url: expectedURL, source } }
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
    const res = await collect.array(stream)
    res.should.containDeep([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: `${source.url}?limit=1&offset=0`, source } },
      { a: 4, b: 5, c: 6, ___meta: { row: 0, url: `${source.url}?limit=1&offset=1`, source } },
      { a: 7, b: 8, c: 9, ___meta: { row: 0, url: `${source.url}?limit=1&offset=2`, source } }
    ])
  })
  it('should request with pagination and context', async () => {
    const source = {
      url: `http://localhost:${port}/{path}`,
      parser: parse('json', { selector: 'data.*' }),
      pagination: {
        limitParam: 'limit',
        offsetParam: 'offset',
        limit: 1
      }
    }
    const stream = fetch(source, { context: { path: 'data' } })
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
    const max = 100000
    const source = {
      url: `http://localhost:${port}/infinite?close=100000`,
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
  it.skip('should end stream as needed with real data', async () => {
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
})

/*eslint no-console: 0*/

import should from 'should'
import collect from 'get-stream'
import express from 'express'
import getPort from 'get-port'
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
      if (close && req.query.continue) res.set('Accept-Ranges', 'bytes')
      if (!res.get('Range')) res.write('[')

      for (let i = 0; i < Infinity; ++i) {
        if (close && i >= close) return res.end()
        res.write(`${JSON.stringify({ a: Math.random() })},`)
      }
      res.write(JSON.stringify({ a: Math.random() }))
      res.write(']')
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
    res.should.eql([
      { a: 1, b: 2, c: 3, ___meta: { row: 0, url: `${source.url}?limit=1&offset=0`, source } },
      { a: 4, b: 5, c: 6, ___meta: { row: 0, url: `${source.url}?limit=1&offset=1`, source } },
      { a: 7, b: 8, c: 9, ___meta: { row: 0, url: `${source.url}?limit=1&offset=2`, source } }
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
  it.skip('should handle stream closes properly, and continue when supported', async () => {
    const max = 1000
    const source = {
      // will close the stream every 100 items, and support ranges
      url: `http://localhost:${port}/infinite?close=100&continue=true`,
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
      parser: parse('json', { selector: 'data.*' }),
      attempts: 1
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
      url: 'http://lkddflskdjf.io/404.json',
      parser: parse('json', { selector: 'data.*' }),
      attempts: 1
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
      parser: parse('json', { selector: 'data.*' }),
      attempts: 1
    })
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
      parser: parse('json', { selector: 'data.*' }),
      attempts: 1
    }, {
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
        parser: parse('json', { selector: 'data.*' }),
        attempts: 1
      },
      {
        url: `http://localhost:${port}/infinite?close=10000`,
        parser: 'json',
        parserOptions: { selector: '*.a' }
      }
    ], {
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
        parser: parse('json', { selector: 'data.*' }),
        attempts: 1
      },
      {
        url: `http://localhost:${port}/infinite?close=10000`,
        parser: 'json',
        parserOptions: { selector: '*.a' }
      }
    ], {
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

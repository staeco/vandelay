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
      res.write('[')
      for (let i = 0; i < 1024; ++i) {
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
      url: `http://localhost:${port}/infinite`,
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
      url: `http://localhost:${port}/infinite`,
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
  it('should emit 404 http errors', (done) => {
    const stream = fetch({
      url: `http://localhost:${port}/404.json`,
      parser: parse('json', { selector: 'data.*' })
    })
    stream.once('error', (err) => {
      should.exist(err)
      err.status.should.equal(404)
      err.message.should.equal('Server responded with "Not Found"')
      err.body.should.equal('404')
      should.not.exist(err.code)
      done()
    })
  })
  it('should emit not found errors', (done) => {
    const stream = fetch({
      url: 'http://lkddflskdjf.io/404.json',
      parser: parse('json', { selector: 'data.*' })
    })
    stream.once('error', (err) => {
      should.exist(err)
      err.message.should.equal('Failed to resolve host')
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
    })
    stream.once('error', (err) => {
      should.exist(err)
      err.status.should.equal(500)
      err.message.should.equal('Server responded with "Server Error"')
      err.body.should.equal('500')
      should.not.exist(err.code)
      done()
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

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
      res.status(404).end()
    })
    app.get('/500.json', (req, res) => {
      res.status(500).end()
    })
    app.get('/data', (req, res) => {
      const { offset, limit } = req.query
      const end = parseInt(offset) + parseInt(limit)
      const data = sample.slice(offset, Math.min(sample.length, end))
      res.json({ data })
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
  it('should emit 404 http errors', (done) => {
    const stream = fetch({
      url: `http://localhost:${port}/404.json`,
      parser: parse('json', { selector: 'data.*' })
    })
    stream.once('error', (err) => {
      should.exist(err)
      err.status.should.equal(404)
      err.message.should.equal('HTTP Error 404 received!')
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
      err.message.should.equal('Failed to resolve host!')
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
      err.message.should.equal('HTTP Error 500 received!')
      done()
    })
  })
})

/*eslint no-console: 0, no-loops/no-loops: "off" */
import collect from 'get-stream'
import express from 'express'
import getPort from 'get-port'
import pumpify from 'pumpify'
import fetch from '../src/fetch'
import tap from '../src/tap'
import transform from '../src/transform'

let port, app, server

describe('pipeline', () => {
  before(async () => {
    port = await getPort()
    app = express()
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
    server = app.listen(port)
  })
  after((cb) => server.close(cb))
  it('should pipeline a single source', async () => {
    const max = 10000
    const source = {
      url: `http://localhost:${port}/infinite?close=10000`,
      parser: 'json',
      parserOptions: { selector: '*.a' }
    }
    const stream = pumpify.obj(
      fetch(source),
      transform('module.exports = (row) => row'),
      tap(async (record) => record)
    )
    const res = await collect.array(stream)
    res.length.should.equal(max)
  })
  it('should handle backpressure correctly with a multi stream', async () => {
    const max = 9000
    const source = [
      {
        url: `http://localhost:${port}/infinite?close=3000`,
        parser: 'json',
        parserOptions: { selector: '*.a' }
      },
      {
        url: `http://localhost:${port}/infinite?close=3000`,
        parser: 'json',
        parserOptions: { selector: '*.a' }
      },
      {
        url: `http://localhost:${port}/infinite?close=3000`,
        parser: 'json',
        parserOptions: { selector: '*.a' }
      }
    ]
    const stream = pumpify.obj(
      fetch(source),
      transform('module.exports = (row) => row'),
      tap(async (record) => record)
    )
    const res = await collect.array(stream)
    res.length.should.equal(max)
  })
})

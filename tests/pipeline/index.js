/*eslint no-console: 0, no-loops/no-loops: "off" */
import collect from 'get-stream'
import express from 'express'
import getPort from 'get-port'
import should from 'should'
import JSONStream from 'jsonstream-next'
import { Readable, PassThrough } from 'stream'
import { format as csvify } from '@fast-csv/format'
import pipeline from '../../src/pipeline'
import fetch from '../../src/fetch'
import transform from '../../src/transform'
import tap from '../../src/tap'

let port, app, server
const sample = [
  { a: 1, b: 2, c: 3 },
  { a: 4, b: 5, c: 6 },
  { a: 7, b: 8, c: 9 }
]

describe('pipeline', () => {
  before(async () => {
    port = await getPort()
    app = express()
    app.get('/big-file.json', (req, res) => {
      const { count = 1000 } = req.query
      res.type('json')

      pipeline(
        Readable.from(new Array(parseInt(count)).fill(sample[0])),
        JSONStream.stringify(),
        res,
        (err) => {
          if (err) res.emit('error', err)
        })
    })
    app.get('/big-file.csv', (req, res) => {
      const { count = 1000 } = req.query
      res.type('csv')

      const data = [
        Object.keys(sample[0]),
        ...new Array(parseInt(count)).fill(Object.values(sample[0]))
      ]
      pipeline(
        Readable.from(data),
        csvify(),
        res,
        (err) => {
          if (err) res.emit('error', err)
        })
    })
    server = app.listen(port)
  })
  after((cb) => server.close(cb))
  it('should work with a basic pipeline', async () => {
    const sources = 2
    const expected = 4000
    const source = {
      url: `http://localhost:${port}/big-file.json?count=${expected}`,
      parser: 'json',
      parserOptions: { selector: '*' }
    }
    // create a slow stream that takes 1ms per item
    const pressure = tap(async (data) => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      return data
    }, { concurrency: sources })
    const stream = pipeline(
      fetch(new Array(sources).fill(source)),
      pressure
    )
    const res = await collect.array(stream)
    should(res.length).eql(expected * sources)
  })
  it('should work with a complex pipeline', async () => {
    const sources = 2
    const expected = 4000
    const source = {
      url: `http://localhost:${port}/big-file.csv?count=${expected}`,
      parser: 'csv'
    }
    // create a slow stream that takes 1ms per item
    const pressure = tap(async (data) => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      return data
    }, { concurrency: sources })
    const bigPressure = tap(async (data) => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      return data
    }, { concurrency: sources / 2 })
    const stream = pipeline(
      fetch(new Array(sources).fill(source)),
      new PassThrough({ objectMode: true }),
      pressure,
      new PassThrough({ objectMode: true }),
      transform(`module.exports = async (row) => {
        await new Promise((resolve) => setTimeout(resolve, 1))
        return row
      }`, { concurrency: sources }),
      new PassThrough({ objectMode: true }),
      bigPressure
    )
    const res = await collect.array(stream)
    should(res.length).eql(expected * sources)
  })
  it('should work with a realistic csv pipeline', async () => {
    const sources = 2
    const expected = 4000
    const source = {
      url: `http://localhost:${port}/big-file.csv?count=${expected}`,
      parser: 'csv'
    }
    // create a slow stream that takes 1ms per item
    const pressure = tap(async (data) => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      return data
    }, { concurrency: expected })
    const stream = pipeline(
      fetch(new Array(sources).fill(source)),
      transform(`module.exports = async (row) => {
        await new Promise((resolve) => setTimeout(resolve, 1))
        return row
      }`, { concurrency: expected }),
      pressure
    )
    const res = await collect.array(stream)
    should(res.length).eql(expected * sources)
  })
})

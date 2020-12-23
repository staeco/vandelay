/*eslint no-console: 0, no-loops/no-loops: "off" */
import express from 'express'
import getPort from 'get-port'
import should from 'should'
import JSONStream from 'jsonstream-next'
import { Readable, PassThrough } from 'stream'
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

describe('pipeline.exhaust', () => {
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
    server = app.listen(port)
  })
  after((cb) => server.close(cb))
  it('should work with a basic pipeline', (done) => {
    const sources = 3
    const expected = 4000
    const source = {
      url: `http://localhost:${port}/big-file.json?count=${expected}`,
      parser: 'json',
      parserOptions: { selector: '*' }
    }

    const res = []
    const pressure = tap(async (data) => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      res.push(data)
    }, { concurrency: sources })
    pipeline.exhaust(
      fetch(new Array(sources).fill(source)),
      pressure,
      (err) => {
        should.not.exist(err)
        should(res.length).eql(expected * sources)
        done()
      }
    )
  })
  it('should work with a complex pipeline', (done) => {
    const sources = 2
    const expected = 4000
    const source = {
      url: `http://localhost:${port}/big-file.json?count=${expected}`,
      parser: 'json',
      parserOptions: { selector: '*' }
    }

    const res = []
    const pressure = tap(async (data) => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      return data
    }, { concurrency: 1000 })
    const bigPressure = tap(async (data) => {
      await new Promise((resolve) => setTimeout(resolve, 2))
      res.push(data)
    }, { concurrency: 64 })
    pipeline.exhaust(
      fetch(new Array(sources).fill(source)),
      new PassThrough({ objectMode: true }),
      pressure,
      new PassThrough({ objectMode: true }),
      transform(`module.exports = async (row) => {
        await new Promise((resolve) => setTimeout(resolve, 1))
        return row
      }`, { concurrency: 32 }),
      new PassThrough({ objectMode: true }),
      bigPressure,
      new PassThrough({ objectMode: true }),
      (err) => {
        should.not.exist(err)
        should(res.length).eql(expected * sources)
        done()
      }
    )
  })
})

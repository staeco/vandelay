/*eslint no-console: 0*/

import should from 'should'
import parse from '../../src/parse'
import { createReadStream } from 'graceful-fs'
import { join } from 'path'
import streamify from 'into-stream'
import collect from 'get-stream'

const zipFixture = join(__dirname, '../fixtures/csv-test.zip')
const zipFixtureMulti = join(__dirname, '../fixtures/csv-test-multi.zip')

describe('parse csv', () => {
  it('should throw on bad options', async () => {
    should.throws(() => parse('csv', { autoFormat: 'yes' }))
  })
  it('should parse a basic list', async () => {
    const data = `a,b,c
1,2,3
4,5,6
7,8,9`
    const parser = parse('csv')
    const stream = streamify(data).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { a: '1', b: '2', c: '3' },
      { a: '4', b: '5', c: '6' },
      { a: '7', b: '8', c: '9' }
    ])
  })
  it('should parse a basic list with autoFormat', async () => {
    const data = `a,b,c
1,2,3
4,5,6
7,8,9`
    const parser = parse('csv', { autoFormat: 'simple' })
    const stream = streamify(data).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3 },
      { a: 4, b: 5, c: 6 },
      { a: 7, b: 8, c: 9 }
    ])
  })
  it('should trim headers', async () => {
    const data = `"  a ",b   ,  c
1,2,3
4,5,6
7,8,9`
    const parser = parse('csv')
    const stream = streamify(data).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { a: '1', b: '2', c: '3' },
      { a: '4', b: '5', c: '6' },
      { a: '7', b: '8', c: '9' }
    ])
  })
  it('should parse from a zip file', async () => {
    const parser = parse('csv', { zip: true })
    const stream = createReadStream(zipFixture).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { a: '1', b: '2', c: '3' },
      { a: '4', b: '5', c: '6' },
      { a: '7', b: '8', c: '9' }
    ])
  })
  it('should parse from a zip file with multiple files', async () => {
    const parser = parse('csv', { zip: true })
    const stream = createReadStream(zipFixtureMulti).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { a: '1', b: '2', c: '3' },
      { a: '4', b: '5', c: '6' },
      { a: '7', b: '8', c: '9' },

      { a: '1', b: '2', c: '3' },
      { a: '4', b: '5', c: '6' },
      { a: '7', b: '8', c: '9' }
    ])
  })
  it('should parse a basic list with aggressive autoFormat', async () => {
    const data = `received at,performed at,called_at
1,2,3
4,5,6
7,8,9`
    const parser = parse('csv', { autoFormat: 'aggressive' })
    const stream = streamify(data).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { receivedAt: 1, performedAt: 2, calledAt: 3 },
      { receivedAt: 4, performedAt: 5, calledAt: 6 },
      { receivedAt: 7, performedAt: 8, calledAt: 9 }
    ])
  })
  it('should parse a basic list with extreme autoFormat on points', async () => {
    const data = `received at,performed at,called_at,lat,lon
1,2,3,1,1
4,5,6,1,1
7,8,9,1,1`
    const parser = parse('csv', { autoFormat: 'extreme' })
    const stream = streamify(data).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { receivedAt: 1, performedAt: 2, calledAt: 3, location: { type: 'Point', coordinates: [ 1, 1 ] } },
      { receivedAt: 4, performedAt: 5, calledAt: 6, location: { type: 'Point', coordinates: [ 1, 1 ] } },
      { receivedAt: 7, performedAt: 8, calledAt: 9, location: { type: 'Point', coordinates: [ 1, 1 ] } }
    ])
  })
  it('should parse a basic list with extreme autoFormat on paths', async () => {
    const data = `received at,performed at,called_at,startLat,startLon,endLat,endLon
1,2,3,1,1,1,1
4,5,6,1,1,1,1
7,8,9,1,1,1,1`
    const parser = parse('csv', { autoFormat: 'extreme' })
    const stream = streamify(data).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { receivedAt: 1, performedAt: 2, calledAt: 3, location: { type: 'LineString', coordinates: [ [ 1, 1 ], [ 1, 1 ] ] } },
      { receivedAt: 4, performedAt: 5, calledAt: 6, location: { type: 'LineString', coordinates: [ [ 1, 1 ], [ 1, 1 ] ] } },
      { receivedAt: 7, performedAt: 8, calledAt: 9, location: { type: 'LineString', coordinates: [ [ 1, 1 ], [ 1, 1 ] ] } }
    ])
  })
  it('should parse a csv with comments', async () => {
    const data = `# 
# Reporting Frequency: Hourly; Date Range: 2020-11-27 14:00 to 2020-11-30 13:00
#
# As of: Nov 30, 2020 1:55:12 PM GMT-08:00
#
Station Id,Station Name,Snow Depth,SWE
356,Blue Lakes,11.2,3.4
357,Ebbets Pass,11.4,3.5
358,Echo Summit,11.8,3.7`

    const parser = parse('csv', { autoFormat: 'simple' })
    const stream = streamify(data).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { 'Station Id': 356, 'Station Name': 'Blue Lakes', 'Snow Depth': 11.2, SWE: 3.4 },
      { 'Station Id': 357, 'Station Name': 'Ebbets Pass', 'Snow Depth': 11.4, SWE: 3.5 },
      { 'Station Id': 358, 'Station Name': 'Echo Summit', 'Snow Depth': 11.8, SWE: 3.7 }
    ])
  })
})

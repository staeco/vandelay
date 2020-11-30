/*eslint no-console: 0*/

import should from 'should'
import parse from '../../src/parse'
import streamify from 'into-stream'
import collect from 'get-stream'

describe('parse tsv', () => {
  it('should throw on bad options', async () => {
    should.throws(() => parse('tsv', { autoFormat: 'yes' }))
  })
  it('should parse a basic list', async () => {
    const data = `a\tb\tc
1\t2\t3
4\t5\t6
7\t8\t9`
    const parser = parse('tsv')
    const stream = streamify(data).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { a: '1', b: '2', c: '3' },
      { a: '4', b: '5', c: '6' },
      { a: '7', b: '8', c: '9' }
    ])
  })
  it('should parse a basic list with autoFormat', async () => {
    const data = `a\tb\tc
1\t2\t3
4\t5\t6
7\t8\t9`
    const parser = parse('tsv', { autoFormat: 'simple' })
    const stream = streamify(data).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3 },
      { a: 4, b: 5, c: 6 },
      { a: 7, b: 8, c: 9 }
    ])
  })
  it('should trim headers', async () => {
    const data = `"  a "\tb    \t   c
1\t2\t3
4\t5\t6
7\t8\t9`
    const parser = parse('tsv')
    const stream = streamify(data).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { a: '1', b: '2', c: '3' },
      { a: '4', b: '5', c: '6' },
      { a: '7', b: '8', c: '9' }
    ])
  })
  it('should parse a basic list with aggressive autoFormat', async () => {
    const data = `received at\tperformed at\tcalled_at
1\t2\t3
4\t5\t6
7\t8\t9`
    const parser = parse('tsv', { autoFormat: 'aggressive' })
    const stream = streamify(data).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { receivedAt: 1, performedAt: 2, calledAt: 3 },
      { receivedAt: 4, performedAt: 5, calledAt: 6 },
      { receivedAt: 7, performedAt: 8, calledAt: 9 }
    ])
  })
  it('should parse a basic list with extreme autoFormat on points', async () => {
    const data = `received at\tperformed at\tcalled_at\tlat\tlon
1\t2\t3\t1\t1
4\t5\t6\t1\t1
7\t8\t9\t1\t1`
    const parser = parse('tsv', { autoFormat: 'extreme' })
    const stream = streamify(data).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { receivedAt: 1, performedAt: 2, calledAt: 3, location: { type: 'Point', coordinates: [ 1, 1 ] } },
      { receivedAt: 4, performedAt: 5, calledAt: 6, location: { type: 'Point', coordinates: [ 1, 1 ] } },
      { receivedAt: 7, performedAt: 8, calledAt: 9, location: { type: 'Point', coordinates: [ 1, 1 ] } }
    ])
  })
  it('should parse a basic list with extreme autoFormat on paths', async () => {
    const data = `received at\tperformed at\tcalled_at\tstartLat\tstartLon\tendLat\tendLon
1\t2\t3\t1\t1\t1\t1
4\t5\t6\t1\t1\t1\t1
7\t8\t9\t1\t1\t1\t1`
    const parser = parse('tsv', { autoFormat: 'extreme' })
    const stream = streamify(data).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { receivedAt: 1, performedAt: 2, calledAt: 3, location: { type: 'LineString', coordinates: [ [ 1, 1 ], [ 1, 1 ] ] } },
      { receivedAt: 4, performedAt: 5, calledAt: 6, location: { type: 'LineString', coordinates: [ [ 1, 1 ], [ 1, 1 ] ] } },
      { receivedAt: 7, performedAt: 8, calledAt: 9, location: { type: 'LineString', coordinates: [ [ 1, 1 ], [ 1, 1 ] ] } }
    ])
  })
  it('should parse a tsv with comments', async () => {
    const data = `# 
# Reporting Frequency: Hourly; Date Range: 2020-11-27 14:00 to 2020-11-30 13:00
#
# As of: Nov 30, 2020 1:55:12 PM GMT-08:00
#
Station Id\tStation Name\tSnow Depth\tSWE
356\tBlue Lakes\t11.2\t3.4
357\tEbbets Pass\t11.4\t3.5
358\tEcho Summit\t11.8\t3.7`

    const parser = parse('tsv', { autoFormat: 'simple' })
    const stream = streamify(data).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { 'Station Id': 356, 'Station Name': 'Blue Lakes', 'Snow Depth': 11.2, SWE: 3.4 },
      { 'Station Id': 357, 'Station Name': 'Ebbets Pass', 'Snow Depth': 11.4, SWE: 3.5 },
      { 'Station Id': 358, 'Station Name': 'Echo Summit', 'Snow Depth': 11.8, SWE: 3.7 }
    ])
  })
})

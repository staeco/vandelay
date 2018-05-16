/*eslint no-console: 0*/

import should from 'should'
import streamify from 'into-stream'
import collect from 'get-stream'
import transform from '../../src/transform'

const data = [
  { a: 1, b: 2, c: 3 },
  { a: 4, b: 5, c: 6 },
  { a: 7, b: 8, c: 9 }
]

describe('transform', () => {
  it('should work with a plain identity function', async () => {
    const stream = streamify.obj(data).pipe(transform((row) => row))
    const res = await collect.array(stream)
    res.should.eql(data)
  })
  it('should work with an async identity function', async () => {
    const stream = streamify.obj(data).pipe(transform(async (row) => row))
    const res = await collect.array(stream)
    res.should.eql(data)
  })
  it('should work with a plain string identity function', async () => {
    const stream = streamify.obj(data).pipe(transform('module.exports = (row) => row'))
    const res = await collect.array(stream)
    res.should.eql(data)
  })
  it('should work with an async string identity function', async () => {
    const stream = streamify.obj(data).pipe(transform('module.exports = async (row) => row'))
    const res = await collect.array(stream)
    res.should.eql(data)
  })
  it('should pass on changes', async () => {
    const map = (row) => ({ ...row, a: null })
    const stream = streamify.obj(data).pipe(transform(map))
    const res = await collect.array(stream)
    res.should.eql(data.map(map))
  })
  it('should skip when null returned', async () => {
    const filter = (row) => row.a > 1 ? null : row
    const stream = streamify.obj(data).pipe(transform(filter))
    const res = await collect.array(stream)
    res.should.eql(data.filter(filter))
  })
  it('should handle errors', async () => {
    const filter = (row) => row.a > 1 ? null : row
    const map = (row) => {
      if (row.a > 1) throw new Error('wot')
      return row
    }
    const stream = streamify.obj(data).pipe(transform(map, {
      onError: (err, record) => {
        should.exist(err)
        should.exist(record)
        should.equal(record.a > 1, true)
      }
    }))
    const res = await collect.array(stream)
    res.should.eql(data.filter(filter))
  })
})

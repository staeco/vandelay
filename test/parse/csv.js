/*eslint no-console: 0*/

import should from 'should'
import parse from '../../src/parse'
import streamify from 'into-stream'
import collect from 'get-stream'

describe('parse csv', () => {
  it('should throw on bad options', async () => {
    should.throws(() => parse('csv', { autoParse: 'yes' }))
    should.throws(() => parse('csv', { camelcase: 'yes' }))
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
  it('should parse a basic list with autoParse', async () => {
    const data = `a,b,c
1,2,3
4,5,6
7,8,9`
    const parser = parse('csv', { autoParse: true })
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
  it('should parse a basic list with camelcase and autoParse', async () => {
    const data = `received at,performed at,called_at
1,2,3
4,5,6
7,8,9`
    const parser = parse('csv', { autoParse: true, camelcase: true })
    const stream = streamify(data).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { receivedAt: 1, performedAt: 2, calledAt: 3 },
      { receivedAt: 4, performedAt: 5, calledAt: 6 },
      { receivedAt: 7, performedAt: 8, calledAt: 9 }
    ])
  })
})

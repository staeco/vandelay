/*eslint no-console: 0*/

import should from 'should'
import parse from '../../src/parse'
import streamify from 'into-stream'
import collect from 'get-stream'

describe('parse json', () => {
  it('should throw on bad selector', async () => {
    should.throws(() => parse('json'))
    should.throws(() => parse('json', { selector: null }))
  })
  it('should parse an array', async () => {
    const data = [ 1, 2, 3, 4, 5 ]
    const sample = JSON.stringify(data)
    const parser = parse('json', { selector: '*' })
    const stream = streamify(sample).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql(data)
  })
  it('should parse a nested object', async () => {
    const data = { a: [ 1, 123 ] }
    const sample = JSON.stringify(data)
    const parser = parse('json', { selector: 'a.*' })
    const stream = streamify(sample).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql(data.a)
  })
  it('should parse an object', async () => {
    const data = { a: [ { b: 1 }, { b: 2 }, { b: 3 } ] }
    const sample = JSON.stringify(data)
    const parser = parse('json', { selector: 'a.*.b' })
    const stream = streamify(sample).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([ 1, 2, 3 ])
  })
  it('should parse an object with multiple selectors', async () => {
    const data = { a: [ { b: 1 }, { a: 2 }, { b: 3 } ] }
    const sample = JSON.stringify(data)
    const parser = parse('json', { selector: [ 'a.*.a', 'a.*.b' ] })
    const stream = streamify(sample).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([ 2, 1, 3 ])
  })
  it('should error on invalid object', async () => {
    const sample = [ '{ "a": [ { "b": 1 },', ' { zzzzz: 123 } ] } }' ]
    const parser = parse('json', { selector: 'a.*.b' })
    const stream = streamify(sample).pipe(parser())
    let theError
    try {
      await collect.array(stream)
    } catch (err) {
      theError = err
    }
    should.exist(theError)
    theError.bufferedData.should.eql([ 1 ])
  })
})

/*eslint no-console: 0*/

import should from 'should'
import parse from '../../src/parse/autoParse'

describe('parse/autoParse', () => {
  it('should trim whitespace', async () => {
    parse(' hi! \n ').should.equal('hi!')
  })
  it('should parse whitespace strings', async () => {
    should.not.exist(parse(''))
    should.not.exist(parse('     '))
    should.not.exist(parse(' \n \t'))
  })
  it('should parse nulls', async () => {
    should.equal(parse('null', null))
    should.equal(parse('nUll', null))
    should.equal(parse('NULL', null))
    should.equal(parse('-', null))
    should.equal(parse(' - ', null))
  })
  it('should parse booleans', async () => {
    parse('true').should.equal(true)
    parse('tRue').should.equal(true)
    parse('TRUE').should.equal(true)
    parse('false').should.equal(false)
    parse('fAlse').should.equal(false)
    parse('FALSE').should.equal(false)
  })
  it('should parse numbers', async () => {
    parse('-129.9451234567').should.equal(-129.9451234567)
    parse('129.9451234567').should.equal(129.9451234567)
    parse('0').should.equal(0)
    parse('-0').should.equal(-0)
    parse('123').should.equal(123)
    parse('-123').should.equal(-123)
    parse('-129,000.9451234567').should.equal(-129000.9451234567)
    parse('NaN').should.eql(NaN)
  })
  it('should parse JSON arrays', async () => {
    parse('["1","2"]').should.eql([ '1', '2' ])
  })
  it('should parse JSON objects', async () => {
    parse('{"a": "2"}').should.eql({ a: '2' })
  })
  it('should parse dates', async () => {
    const sampleDate = new Date('Tue May 15 2018 12:07:52 GMT-0400 (EDT)')
    parse('Tue May 15 2018 12:07:52 GMT-0400 (EDT)').should.eql(sampleDate)
    parse('2018-05-15T16:07:52.000Z').should.eql(sampleDate)
    parse('May 15, 2018 12:07:52 EDT').should.eql(sampleDate)
    parse('Tue, 15 May 2018 16:07:52 GMT').should.eql(sampleDate)
    parse('5/15/2018').should.be.instanceof(Date)
    // awaiting https://github.com/date-fns/date-fns/issues/450
    // parse('/Date(1526400472000)/').should.eql(sampleDate)
    // parse('/Date(1526400472000+0400)/').should.eql(sampleDate)
  })
})

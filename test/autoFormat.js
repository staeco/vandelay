/*eslint no-console: 0*/

import should from 'should'
import * as format from '../src/autoFormat'

describe('autoFormat', () => {
  it('should trim whitespace', async () => {
    format.simple(' hi! \n ').should.equal('hi!')
  })
  it('should parse whitespace strings', async () => {
    should.not.exist(format.simple(''))
    should.not.exist(format.simple('     '))
    should.not.exist(format.simple(' \n \t'))
  })
  it('should parse nulls', async () => {
    should.equal(format.simple('null', null))
    should.equal(format.simple('nUll', null))
    should.equal(format.simple('NULL', null))
    should.equal(format.simple('-', null))
    should.equal(format.simple(' - ', null))
  })
  it('should parse booleans', async () => {
    format.simple('true').should.equal(true)
    format.simple('tRue').should.equal(true)
    format.simple('TRUE').should.equal(true)
    format.simple('false').should.equal(false)
    format.simple('fAlse').should.equal(false)
    format.simple('FALSE').should.equal(false)
  })
  it('should parse numbers', async () => {
    format.simple('-129.9451234567').should.equal(-129.9451234567)
    format.simple('129.9451234567').should.equal(129.9451234567)
    format.simple('0').should.equal(0)
    format.simple('-0').should.equal(-0)
    format.simple('123').should.equal(123)
    format.simple('-123').should.equal(-123)
    format.simple('-129,000.9451234567').should.equal(-129000.9451234567)
    format.simple('NaN').should.eql(NaN)
  })
  it('should parse JSON', async () => {
    format.simple('["1","2"]').should.eql([ '1', '2' ])
    format.simple('{"a": "2"}').should.eql({ a: '2' })
    format.simple('"1"').should.eql('1')
  })
  it('should parse dates', async () => {
    const sampleDate = new Date('Tue May 15 2018 12:07:52 GMT-0400 (EDT)')
    format.simple('Tue May 15 2018 12:07:52 GMT-0400 (EDT)').should.eql(sampleDate)
    format.simple('2018-05-15T16:07:52.000Z').should.eql(sampleDate)
    format.simple('May 15, 2018 12:07:52 EDT').should.eql(sampleDate)
    format.simple('Tue, 15 May 2018 16:07:52 GMT').should.eql(sampleDate)
    format.simple('5/15/2018').should.be.instanceof(Date)
    format.simple('/Date(1526400472000)/').should.eql(sampleDate)
    format.simple('/Date(1526400472000+0400)/').should.eql(sampleDate)
  })
})

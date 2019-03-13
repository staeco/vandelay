/*eslint no-console: 0*/

import should from 'should'
import * as format from '../src/autoFormat'

describe('autoFormat.infer', () => {
  it('should trim whitespace', async () => {
    format.infer(' hi! \n ').should.equal('hi!')
  })
  it('should parse whitespace strings', async () => {
    should.not.exist(format.infer(''))
    should.not.exist(format.infer('     '))
    should.not.exist(format.infer(' \n \t'))
  })
  it('should parse nulls', async () => {
    should.equal(format.infer('null', null))
    should.equal(format.infer('nUll', null))
    should.equal(format.infer('NULL', null))
    should.equal(format.infer('-', null))
    should.equal(format.infer(' - ', null))
  })
  it('should parse booleans', async () => {
    format.infer('true').should.equal(true)
    format.infer('tRue').should.equal(true)
    format.infer('TRUE').should.equal(true)
    format.infer('false').should.equal(false)
    format.infer('fAlse').should.equal(false)
    format.infer('FALSE').should.equal(false)
  })
  it('should parse numbers', async () => {
    format.infer('-129.9451234567').should.equal(-129.9451234567)
    format.infer('129.9451234567').should.equal(129.9451234567)
    format.infer('0').should.equal(0)
    format.infer('-0').should.equal(-0)
    format.infer('123').should.equal(123)
    format.infer('-123').should.equal(-123)
    format.infer('-129,000.9451234567').should.equal(-129000.9451234567)
    format.infer('NaN').should.eql(NaN)
  })
  it('should parse JSON', async () => {
    format.infer('["1","2"]').should.eql([ '1', '2' ])
    format.infer('{"a": "2"}').should.eql({ a: '2' })
    format.infer('"1"').should.eql('1')
  })
  it('should parse dates', async () => {
    const sampleDate = new Date('Tue May 15 2018 12:07:52 GMT-0400 (EDT)')
    format.infer('Tue May 15 2018 12:07:52 GMT-0400 (EDT)').should.eql(sampleDate)
    format.infer('2018-05-15T16:07:52.000Z').should.eql(sampleDate)
    format.infer('May 15, 2018 12:07:52 EDT').should.eql(sampleDate)
    format.infer('Tue, 15 May 2018 16:07:52 GMT').should.eql(sampleDate)
    format.infer('5/15/2018').should.be.instanceof(Date)
    format.infer('/Date(1526400472000)/').should.eql(sampleDate)
    format.infer('/Date(1526400472000+0400)/').should.eql(sampleDate)
  })
  it('should parse WKT', async () => {
    format.infer('POINT (30 10)').should.eql({ type: 'Point', coordinates: [ 30, 10 ] })
    format.infer('LINESTRING(30 10, 10 30, 40 40)').should.eql({
      type: 'LineString',
      coordinates: [ [ 30, 10 ], [ 10, 30 ], [ 40, 40 ] ]
    })
    format.infer('MULTIPOLYGON (((40 40, 20 45, 45 30, 40 40)),((20 35, 10 30, 10 10, 30 5, 45 20, 20 35),(30 20, 20 15, 20 25, 30 20)))').should.eql({
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [ 40, 40 ],
            [ 20, 45 ],
            [ 45, 30 ],
            [ 40, 40 ]
          ]
        ],
        [
          [
            [ 20, 35 ],
            [ 10, 30 ],
            [ 10, 10 ],
            [ 30, 5 ],
            [ 45, 20 ],
            [ 20, 35 ]
          ],
          [
            [ 30, 20 ],
            [ 20, 15 ],
            [ 20, 25 ],
            [ 30, 20 ]
          ]
        ]
      ]
    })
  })
})

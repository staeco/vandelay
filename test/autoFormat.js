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
    should.equal(format.infer(' ', null))
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
    format.infer('0000').should.equal(0)
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

    // false positive checks
    format.infer('R-1').should.eql('R-1')
    format.infer('R-105').should.eql('R-105')
    format.infer('RAAAAAAA-105').should.eql('RAAAAAAA-105')
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

describe('autoFormat.extreme', () => {
  it('should work with nested objects', () => {
    format.extreme({
      'type': 'Feature',
      'properties': {
        'OBJECTID': 5001,
        'ID': 1993276342,
        'ADDRESS': '8830 SW 41 ST                ',
        'STNDADDR': '8830 SW 41ST ST',
        'UNIT': '    ',
        'PROCNUM': 'C1993374261',
        'FOLIO': '3040210070610',
        'GEOFOLIO': '3040210070610',
        'ISCONDO': 'N',
        'TYPE': 'BLDG',
        'CAT1': '0095',
        'DESC1': 'ASPHALT (FIBERGLASS) SHINGLE ROOFS                          ',
        'CAT2': '0000',
        'DESC2': '                                                            ',
        'CAT3': '0000',
        'DESC3': '                                                            ',
        'CAT4': '0000',
        'DESC4': '                                                            ',
        'CAT5': '0000',
        'DESC5': '                                                            ',
        'CAT6': '0000',
        'DESC6': '                                                            ',
        'CAT7': '0000',
        'DESC7': '                                                            ',
        'CAT8': '0000',
        'DESC8': '                                                            ',
        'CAT9': '0000',
        'DESC9': '                                                            ',
        'CAT10': '0000',
        'DESC10': '                                                            ',
        'ISSUDATE': '1993-08-18T00:00:00.000Z',
        'LSTINSDT': '00000000',
        'RENDATE': '00000000',
        'CCDATE': '00000000',
        'BLDCMPDT': '00000000',
        'RESCOMM': 'R',
        'BPSTATUS': 'E',
        'PROPUSE': '0220',
        'APPTYPE': '13',
        'CLUC': '0001',
        'FFRMLINE': ' REROOF            ',
        'LGLDESC1': 'LAKEVIEW MANORS       PB 61-14   ',
        'LGLDESC2': 'LOT 5                 BLK 5      ',
        'ESTVALUE': '00000003150',
        'PTSOURCE': 'P',
        'MPRMTNUM': 0,
        'LSTAPPRDT': '00000000',
        'CONTRNUM': 'CCC056647       ',
        'CONTRNAME': 'VICH ROBERTO S                                              '
      },
      'geometry': {
        'type': 'Point',
        'coordinates': [
          -80.33846015975838,
          25.731568261802746
        ]
      }
    }).should.eql({
      'geometry': {
        'coordinates': [
          -80.33846015975838,
          25.731568261802746
        ],
        'type': 'Point'
      },
      'properties': {
        'address': '8830 SW 41 ST',
        'apptype': 13,
        'bpstatus': 'E',
        'cat1': 95,
        'cluc': 1,
        'contrname': 'VICH ROBERTO S',
        'contrnum': 'CCC056647',
        'desc1': 'ASPHALT (FIBERGLASS) SHINGLE ROOFS',
        'estvalue': 3150,
        'ffrmline': 'REROOF',
        'folio': 3040210070610,
        'geofolio': 3040210070610,
        'id': 1993276342,
        'issudate': new Date('1993-08-18T00:00:00.000Z'),
        'lgldesc1': 'LAKEVIEW MANORS       PB 61-14',
        'lgldesc2': 'LOT 5                 BLK 5',
        'objectid': 5001,
        'procnum': 'C1993374261',
        'propuse': 220,
        'ptsource': 'P',
        'rescomm': 'R',
        'stndaddr': '8830 SW 41ST ST',
        'type': 'BLDG'
      },
      'type': 'Feature'
    })
  })
})

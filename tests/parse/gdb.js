/*eslint no-console: 0*/

import parse from '../../src/parse'
import collect from 'get-stream'
import { createReadStream } from 'graceful-fs'
import { join } from 'path'

const gdbFixture = join(__dirname, '../fixtures/gdb-sacramento-crime.zip')

//should(res.length).equal(327284)
// res[0]).eql(
const expected = {
  type: 'Feature',
  properties: {
    ActivityNumber: '',
    District: '',
    Neighborhood: 'Old Fair Oaks',
    OccurenceStartDate: '2009-03-26T17:10:00.000Z',
    OccurenceEndDate: '2009-03-26T17:19:59.000Z',
    ReportDate: '2009-03-26T17:39:00.000Z',
    OccurenceLocation: '9300 Block of Fair O',
    OccurenceCity: 'Fair Oaks',
    OccurenceZipCode: '95628',
    PrimaryViolation: 'PC 594(B)(1) Vandalism ($400 Or More)'
  },
  geometry: {
    type: 'Point',
    coordinates: [
      -121.28634428721016,
      38.6364523999071
    ]
  }
}


describe('parse gdb', function () {
  this.timeout(510000)
  it('should parse a gdb file', async () => {
    const parser = parse('gdb')
    const stream = createReadStream(gdbFixture).pipe(parser())
    const res = await collect.array(stream)
    res[0].should.eql(expected)
  })
})

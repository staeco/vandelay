/*eslint no-console: 0*/

import parse from '../../src/parse'
import collect from 'get-stream'
import fs, { createReadStream } from 'graceful-fs'
import { join } from 'path'

const gpxFixture = join(__dirname, 'gpx-run.gpx')
const expected = fs.readFileSync(join(__dirname, 'gpx-run.geojson'))

describe('parse gpx', () => {
  it('should parse a gpx file', async () => {
    const parser = parse('gpx')
    const stream = createReadStream(gpxFixture).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql(JSON.parse(expected).features)
  })
})

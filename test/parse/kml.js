/*eslint no-console: 0*/

import parse from '../../src/parse'
import collect from 'get-stream'
import fs, { createReadStream } from 'graceful-fs'
import { join } from 'path'

const kmlFixture = join(__dirname, 'kml-farmers-markets.kml')
const expected = fs.readFileSync(join(__dirname, 'kml-farmers-markets.geojson'))

describe('parse kml', () => {
  it('should parse a kml file', async () => {
    const parser = parse('kml')
    const stream = createReadStream(kmlFixture).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql(JSON.parse(expected).features)
  })
})

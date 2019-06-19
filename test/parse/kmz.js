/*eslint no-console: 0*/

import parse from '../../src/parse'
import collect from 'get-stream'
import fs, { createReadStream } from 'graceful-fs'
import { join } from 'path'

const kmzFixture = join(__dirname, 'kmz-farmers-markets.zip')
const expected = fs.readFileSync(join(__dirname, 'kml-farmers-markets.geojson'))

describe('parse kmz', () => {
  it('should parse a kmz file', async () => {
    const parser = parse('kmz')
    const stream = createReadStream(kmzFixture).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql(JSON.parse(expected).features)
  })
})

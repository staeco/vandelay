/*eslint no-console: 0*/

import parse from '../../src/parse'
import collect from 'get-stream'
import { createReadStream } from 'fs'
import { join } from 'path'

const shpFixture = join(__dirname, 'shp-fixture.zip')
const sample = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [ 0, 0 ]
      },
      properties: {
        name: 'Foo'
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [ 0, 10 ]
      },
      properties: {
        name: 'Bar'
      }
    }
  ]
}

describe('parse shp', () => {
  it('should parse a basic list', async () => {
    const parser = parse('shp')
    const stream = createReadStream(shpFixture).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql(sample.features)
  })
})

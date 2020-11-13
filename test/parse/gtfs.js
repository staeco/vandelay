/*eslint no-console: 0*/

import should from 'should'
import parse from '../../src/parse'
import streamify from 'into-stream'
import collect from 'get-stream'
import { createReadStream } from 'graceful-fs'
import { join } from 'path'

const fixture = join(__dirname, '../fixtures/sample-feed.zip')

describe('parse gtfs', () => {
  it.skip('should parse a feed', async () => {
    const parser = parse('gtfs')
    const stream = createReadStream(fixture).pipe(parser())
    const res = await collect.array(stream)
    should.exist(res)
    res.length.should.equal(74)
  })
  it('should error on invalid object', async () => {
    const sample = 'aksndflaks'
    const parser = parse('gtfs')
    const stream = streamify(sample).pipe(parser())
    let theError
    try {
      await collect.array(stream)
    } catch (err) {
      theError = err
    }
    should.exist(theError)
  })
})

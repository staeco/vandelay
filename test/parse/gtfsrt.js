/*eslint no-console: 0*/

import should from 'should'
import parse from '../../src/parse'
import streamify from 'into-stream'
import collect from 'get-stream'
import { createReadStream } from 'graceful-fs'
import { join } from 'path'

const rtFixture = join(__dirname, 'gtfsrt.feed')

describe('parse gtfsrt', () => {
  it('should parse a feed', async () => {
    const parser = parse('gtfsrt')
    const stream = createReadStream(rtFixture).pipe(parser())
    const res = await collect.array(stream)
    should.exist(res)
    res.length.should.equal(471)
    res[0].id.should.equal('000001')
  })
  it('should error on invalid object', async () => {
    const sample = 'aksndflaks'
    const parser = parse('gtfsrt')
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

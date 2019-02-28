/*eslint no-console: 0*/

import should from 'should'
import parse from '../../src/parse'
import streamify from 'into-stream'
import collect from 'get-stream'

describe('parse ndjson', () => {
  it('should parse an array', async () => {
    const data = [
      { a: '123' },
      { b: 456 }
    ]
    const sample = data.map((v) => JSON.stringify(v)).join('\n')
    const parser = parse('ndjson')
    const stream = streamify(sample).pipe(parser())
    const res = await collect.array(stream)
    should(res).eql(data)
  })
})

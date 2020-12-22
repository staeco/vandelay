/*eslint no-console: 0, no-loops/no-loops: "off" */

import should from 'should'
import streamify from 'into-stream'
import collect from 'get-stream'
import pipeline from '../../src/pipeline'
import tap from '../../src/tap'

describe('tap', () => {
  it('should work with concurrency', async () => {
    const items = 100
    const concurrency = 10
    const data = new Array(items).fill({ a: 1, b: 2, c: 3 })
    const tapStream = tap(async (row) => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      return row
    }, { concurrency })
    const stream = pipeline(
      streamify.object(data),
      tapStream
    )
    const res = await collect.array(stream)
    res.should.eql(data)
    should(tapStream.queueState.maxReached).eql(concurrency)
    should(tapStream.queueState.maxQueue).eql(1)
  })
})

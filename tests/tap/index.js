/*eslint no-console: 0, no-loops/no-loops: "off" */

import should from 'should'
import streamify from 'into-stream'
import collect from 'get-stream'
import pipeline from '../../src/pipeline'
import tap from '../../src/tap'

describe('tap', () => {
  it('should work with concurrency', async () => {
    const items = 2000
    const concurrency = 64
    const data = new Array(items).fill({ a: 1, b: 2, c: 3 })
    const tapStream = tap(async (row) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
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
  it('should work with concurrency and backpressure', async () => {
    const items = 2000
    const concurrency = 64
    const data = new Array(items).fill({ a: 1, b: 2, c: 3 })
    const tapStream = tap(async (row) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return row
    }, { concurrency })
    const tapStream2 = tap(async (row) => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      return row
    }, { concurrency })
    const tapStream3 = tap(async (row) => row, { concurrency })
    const stream = pipeline(
      streamify.object(data),
      tapStream,
      tapStream2,
      tapStream3
    )
    const res = await collect.array(stream)
    res.should.eql(data)
  })
})

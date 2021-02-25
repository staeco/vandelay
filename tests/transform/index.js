/*eslint no-console: 0, no-loops/no-loops: "off" */

import should from 'should'
import streamify from 'into-stream'
import collect from 'get-stream'
import compile from 'vandelay-es6'
import { PassThrough } from 'stream'
import pipeline from '../../src/pipeline'
import transform from '../../src/transform'

const data = [
  { a: 1, b: 2, c: 3 },
  { a: 4, b: 5, c: 6 },
  { a: 7, b: 8, c: 9 }
]

describe('transform', () => {
  it('should work with a plain identity function', async () => {
    const stream = pipeline(streamify.object(data), transform((row) => row))
    const res = await collect.array(stream)
    res.should.eql(data)
  })
  it('should work with an async identity function', async () => {
    const stream = pipeline(streamify.object(data), transform(async (row) => row))
    const res = await collect.array(stream)
    res.should.eql(data)
  })
  it('should work with a plain string identity function', async () => {
    const stream = pipeline(streamify.object(data), transform('module.exports = (row) => row'))
    const res = await collect.array(stream)
    res.should.eql(data)
  })
  it('should work with an async string identity function', async () => {
    const stream = pipeline(streamify.object(data), transform('module.exports = async (row) => row'))
    const res = await collect.array(stream)
    res.should.eql(data)
  })
  it('should work fast with an async string identity function', async () => {
    const max = 10000
    const thru = new PassThrough({ objectMode: true })
    const write = () => {
      for (let i = 0; i < max; ++i) {
        thru.push({ test: 'abc' })
      }
      thru.end(null)
    }
    process.nextTick(write)
    const res = await collect.array(pipeline(thru, transform('module.exports = async (row) => row')))
    res.length.should.equal(max)
  })
  it('should work with an empty transform stack', async () => {
    const stream = pipeline(streamify.object(data), transform({}))
    const res = await collect.array(stream)
    res.should.eql(data.map(() => ({})))
  })
  it('should work with a working transform stack', async () => {
    const stream = pipeline(streamify.object(data), transform({ data: { field: 'a' } }))
    const res = await collect.array(stream)
    res.should.eql(data.map(({ a }) => ({ data: a })))
  })
  it('should work fast with a working transform stack', async () => {
    const max = 10000
    const write = () => {
      for (let i = 0; i < max; ++i) {
        stream.write({ a: 'abc' })
      }
      stream.end()
    }
    process.nextTick(write)
    const stream = transform({ data: { field: 'a' } })
    const res = await collect.array(stream)
    res.length.should.equal(max)
  })
  it('should pass on changes', async () => {
    const map = (row) => ({ ...row, a: null })
    const stream = pipeline(streamify.object(data), transform(map, {
      onSuccess: (record, old) => {
        should.exist(record)
        should.exist(old)
        should.equal(old.a != null, true)
        should.equal(record.a, null)
      }
    }))
    const res = await collect.array(stream)
    res.should.eql(data.map(map))
  })
  it('should work with arrays', async () => {
    const map = (row) => [ row, row ]
    const stream = pipeline(streamify.object(data), transform(map, {
      onSuccess: (record, old) => {
        should.exist(record)
        should.exist(old)
      }
    }))
    const res = await collect.array(stream)
    res.should.eql(data.map(map))
    Array.isArray(res).should.equal(true)
  })
  it('should skip when null returned', async () => {
    const filter = (row) => row.a > 1 ? null : row
    const stream = pipeline(streamify.object(data), transform(filter, {
      onSuccess: (record, old) => {
        should.exist(record)
        should.exist(old)
        should.equal(record, old)
        should.equal(record.a <= 1, true)
      },
      onSkip: (record) => {
        should.exist(record)
        should.equal(record.a > 1, true)
      }
    }))
    const res = await collect.array(stream)
    res.should.eql(data.filter(filter))
  })
  it('should skip when false returned from filter fn', async () => {
    const map = (row) => row
    const filter = (row) => row.a <= 1
    const stream = pipeline(streamify.object(data), transform(map, {
      filter,
      onSuccess: (record, old) => {
        should.exist(record)
        should.exist(old)
        should.equal(record, old)
        should.equal(record.a <= 1, true)
      },
      onSkip: (record) => {
        should.exist(record)
        should.equal(record.a > 1, true)
      }
    }))
    const res = await collect.array(stream)
    res.should.eql(data.filter(filter))
  })
  it('should handle errors', async () => {
    const filter = (row) => row.a > 1 ? null : row
    const map = (row) => {
      if (row.a > 1) throw new Error('wot')
      return row
    }
    const stream = pipeline(streamify.object(data), transform(map, {
      onSuccess: (record, old) => {
        should.exist(record)
        should.exist(old)
        should.equal(record, old)
        should.equal(record.a <= 1, true)
      },
      onError: (err, record) => {
        should.exist(err)
        should.exist(record)
        should.equal(record.a > 1, true)
        err.message.should.equal('wot')
      }
    }))
    const res = await collect.array(stream)
    res.should.eql(data.filter(filter))
  })
  it('should handle errors with a plain function', async () => {
    const filter = (row) => row.a > 1 ? null : row
    const map = `module.exports = (row) => {
      if (row.a > 1) throw new Error('wot')
      return row
    }`
    const fail = () => {
      throw new Error('Fail! Error escaped.')
    }
    process.on('uncaughtException', fail)
    process.on('uncaughtRejection', fail)
    const stream = pipeline(streamify.object(data), transform(map, {
      onSuccess: (record, old) => {
        should.exist(record)
        should.exist(old)
        should.equal(record, old)
        should.equal(record.a <= 1, true)
      },
      onError: (err, record) => {
        should.exist(err)
        should.exist(record)
        should.equal(record.a > 1, true)
        err.message.should.equal('wot')
      }
    }))
    const res = await collect.array(stream)
    res.should.eql(data.filter(filter))

    process.removeListener('uncaughtException', fail)
    process.removeListener('uncaughtRejection', fail)
  })
  it('should handle errors with a async function', async () => {
    const filter = (row) => row.a > 1 ? null : row
    const map = `module.exports = async (row) => {
      if (row.a > 1) {
        process.nextTick(() => { throw new Error('wot') })
        return null
      }
      return row
    }`
    const fail = () => {
      throw new Error('Fail! Error escaped.')
    }
    process.on('uncaughtException', fail)
    process.on('uncaughtRejection', fail)
    const stream = pipeline(streamify.object(data), transform(map, {
      onSuccess: (record, old) => {
        should.exist(record)
        should.exist(old)
        should.equal(record, old)
        should.equal(record.a <= 1, true)
      },
      onError: (err, record) => {
        should.exist(err)
        should.exist(record)
        should.equal(record.a > 1, true)
        err.message.should.equal('wot')
      }
    }))
    const res = await collect.array(stream)
    res.should.eql(data.filter(filter))

    process.removeListener('uncaughtException', fail)
    process.removeListener('uncaughtRejection', fail)
  })
  it('should handle stray async errors', async () => {
    const filter = (row) => row.a > 1 ? null : row
    const map = `process.nextTick(() => { throw new Error('wot') })
    module.exports = (row) => {
      if (row.a > 1) throw new Error('wot')
      return row
    }`
    const fail = () => {
      throw new Error('Fail! Error escaped.')
    }
    process.on('uncaughtException', fail)
    process.on('uncaughtRejection', fail)
    const stream = pipeline(streamify.object(data), transform(map, {
      onSuccess: (record, old) => {
        should.exist(record)
        should.exist(old)
        should.equal(record, old)
        should.equal(record.a <= 1, true)
      },
      onError: (err, record) => {
        should.exist(err)
        should.exist(record)
        should.equal(record.a > 1, true)
        err.message.should.equal('wot')
      }
    }))
    const res = await collect.array(stream)
    res.should.eql(data.filter(filter))

    process.removeListener('uncaughtException', fail)
    process.removeListener('uncaughtRejection', fail)
  })
  it.skip('should handle while(true)', async () => {
    const map = `module.exports = (row) => {
      while (true) {}
      return row
    }`
    const stream = pipeline(streamify.object(data), transform(map, { timeout: 1000 }))
    const res = await collect.array(stream)
    res.should.eql([])
  })
  it('should work with a compiler and support ES7', (done) => {
    let finished = false
    // demonstrating as many language features as possible in one function
    const stream = pipeline(streamify.object(data), transform(`
      import url from 'url'
      export default async (row) => {
        if (row?.properties?.noExist) return null
        const dummy = Array.from(new Set([ 1, 2, 3, 2, 1 ]))
        await new Promise((resolve) => setTimeout(resolve, 100))
        return {
          ...row
        }
      }
    `, {
      compiler: compile,
      timeout: 1000,
      onError: (err) => {
        if (!finished) {
          finished = true
          done(err)
        }
      }
    }))
    collect.array(stream).then((res) => {
      res.should.eql(data)
      if (!finished) done()
    }).catch(done)
  })
  it('should provide proper globals', async () => {
    const map = `
    const assert = require('assert')

    module.exports = (row) => {
      assert(URL)
      assert(setTimeout)
      assert(Promise)
      assert(ArrayBuffer)
      assert(Buffer)
      assert(TextEncoder)
      assert(TextDecoder)
      assert(URLSearchParams)
      assert(clearTimeout)
      assert(console)
      return row
    }`
    const fail = (err) => {
      throw new Error(`Fail! Error escaped: ${err?.message}`)
    }
    process.on('uncaughtException', fail)
    process.on('uncaughtRejection', fail)
    const stream = pipeline(streamify.object(data), transform(map, {
      onSuccess: (record, old) => {
        should.exist(record)
        should.exist(old)
        should.equal(record, old)
      },
      onError: fail
    }))
    const res = await collect.array(stream)
    res.should.eql(data)

    process.removeListener('uncaughtException', fail)
    process.removeListener('uncaughtRejection', fail)
  })
  it('should have fixed inner concurrency', async () => {
    const map = `
    import memo from 'moize'

    const state = { count: 0 }
    const fn = memo.promise(async () =>
      new Promise((resolve) => {
        setTimeout(() => {
          ++state.count
          resolve()
        }, 10)
      })
    )
    export default async (row) => {
      const res = await fn()
      if (state.count !== 1) throw new Error('Count increased more than once!')
      return row
    }`
    const fail = (err) => {
      throw new Error(`Fail! Error escaped: ${err?.message}`)
    }
    process.on('uncaughtException', fail)
    process.on('uncaughtRejection', fail)
    const stream = pipeline(streamify.object(data), transform(map, {
      concurrency: 16,
      externalModules: [ 'moize' ],
      compiler: compile,
      onSuccess: (record, old) => {
        should.exist(record)
        should.exist(old)
        should.equal(record, old)
      },
      onError: fail
    }))
    const res = await collect.array(stream)
    res.should.eql(data)

    process.removeListener('uncaughtException', fail)
    process.removeListener('uncaughtRejection', fail)
  })
  it('should have fixed outer concurrency', async () => {
    const state = { count: 0 }
    const map = `
    import memo from 'moize'

    const fn = memo.promise(async () =>
      new Promise((resolve) => {
        setTimeout(() => {
          ++state.count
          resolve()
        }, 10)
      })
    )
    export default async (row) => {
      const res = await fn()
      return row
    }`
    const fail = (err) => {
      throw new Error(`Fail! Error escaped: ${err?.message}`)
    }
    process.on('uncaughtException', fail)
    process.on('uncaughtRejection', fail)
    const stream = pipeline(streamify.object(data), transform(map, {
      concurrency: 16,
      externalModules: [ 'moize' ],
      compiler: compile,
      unsafeGlobals: { state },
      onSuccess: (record, old) => {
        should.exist(record)
        should.exist(old)
        should.equal(record, old)
      },
      onError: fail
    }))
    const res = await collect.array(stream)
    res.should.eql(data)
    should(state.count).eql(1)
    process.removeListener('uncaughtException', fail)
    process.removeListener('uncaughtRejection', fail)
  })
})

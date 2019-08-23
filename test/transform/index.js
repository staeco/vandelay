/*eslint no-console: 0, no-loops/no-loops: "off" */

import should from 'should'
import streamify from 'into-stream'
import collect from 'get-stream'
import compile from 'vandelay-es6'
import transform from '../../src/transform'

const data = [
  { a: 1, b: 2, c: 3 },
  { a: 4, b: 5, c: 6 },
  { a: 7, b: 8, c: 9 }
]

describe('transform', () => {
  it('should work with a plain identity function', async () => {
    const stream = streamify.object(data).pipe(transform((row) => row))
    const res = await collect.array(stream)
    res.should.eql(data)
  })
  it('should work with an async identity function', async () => {
    const stream = streamify.object(data).pipe(transform(async (row) => row))
    const res = await collect.array(stream)
    res.should.eql(data)
  })
  it('should work with a plain string identity function', async () => {
    const stream = streamify.object(data).pipe(transform('module.exports = (row) => row'))
    const res = await collect.array(stream)
    res.should.eql(data)
  })
  it('should work with an async string identity function', async () => {
    const stream = streamify.object(data).pipe(transform('module.exports = async (row) => row'))
    const res = await collect.array(stream)
    res.should.eql(data)
  })
  it('should work fast with an async string identity function', async () => {
    const max = 10000
    const write = () => {
      for (let i = 0; i < max; ++i) {
        stream.write({ test: 'abc' })
      }
      stream.end()
    }
    process.nextTick(write)
    const stream = transform('module.exports = async (row) => row')
    const res = await collect.array(stream)
    res.length.should.equal(max)
  })
  it('should work with an empty transform stack', async () => {
    const stream = streamify.object(data).pipe(transform({}))
    const res = await collect.array(stream)
    res.should.eql(data.map(() => ({})))
  })
  it('should work with a working transform stack', async () => {
    const stream = streamify.object(data).pipe(transform({ data: { field: 'a' } }))
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
    const stream = streamify.object(data).pipe(transform(map, {
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
    const stream = streamify.object(data).pipe(transform(map, {
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
    const stream = streamify.object(data).pipe(transform(filter, {
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
    const stream = streamify.object(data).pipe(transform(map, {
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
    const stream = streamify.object(data).pipe(transform(map, {
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
    const stream = streamify.object(data).pipe(transform(map, {
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
    const stream = streamify.object(data).pipe(transform(map, {
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
    const stream = streamify.object(data).pipe(transform(map, {
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
    const stream = streamify.object(data).pipe(transform(map, { timeout: 1000 }))
    const res = await collect.array(stream)
    res.should.eql([])
  })
  it('should work with a compiler and support ES7', (done) => {
    let finished = false
    // demonstrating as many language features as possible in one function
    const stream = streamify.object(data).pipe(transform(`
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
})

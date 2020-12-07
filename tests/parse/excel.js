/*eslint no-console: 0*/

import should from 'should'
import parse from '../../src/parse'
import collect from 'get-stream'
import xlsx from 'xlsx'
import { createReadStream } from 'graceful-fs'
import tmp from 'tempfile'
import { join } from 'path'

const xlsFixture = join(__dirname, '../fixtures/xls-fixture.xls')
const xlsxFixture = join(__dirname, '../fixtures/xlsx-fixture.xlsx')
const xlsxFixture2 = join(__dirname, '../fixtures/xlsx-fixture-2.xlsx')

const arrToExcel = (arr) => {
  const headers = Object.keys(arr[0])
  const data = [
    headers,
    ...arr.map((i) => Object.values(i))
  ]
  const wb = {
    SheetNames: [ 'Test' ],
    Sheets: {
      Test: xlsx.utils.aoa_to_sheet(data)
    }
  }
  const fname = tmp('.xlsx')
  xlsx.writeFile(wb, fname)
  return createReadStream(fname)
}

describe('parse excel', () => {
  it('should throw on bad options', async () => {
    should.throws(() => parse('excel', { autoFormat: 'yes' }))
  })
  it('should parse a basic list', async () => {
    const sample = [
      { a: 1, b: 2, c: 3 },
      { a: 4, b: 5, c: 6 },
      { a: 7, b: 8, c: 9 }
    ]
    const parser = parse('excel')
    const stream = arrToExcel(sample).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3 },
      { a: 4, b: 5, c: 6 },
      { a: 7, b: 8, c: 9 }
    ])
  })
  it('should parse a basic list with autoFormat', async () => {
    const sample = [
      { a: '1', b: '2', c: '3' },
      { a: 4, b: 5, c: 6 },
      { a: 7, b: ' 8', c: 9 }
    ]
    const parser = parse('excel', { autoFormat: 'simple' })
    const stream = arrToExcel(sample).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3 },
      { a: 4, b: 5, c: 6 },
      { a: 7, b: 8, c: 9 }
    ])
  })
  it('should trim headers', async () => {
    const sample = [
      { ' a': 1, b: 2, c: 3 },
      { ' a': 4, b: 5, c: 6 },
      { ' a': 7, b: 8, c: 9 }
    ]
    const parser = parse('excel')
    const stream = arrToExcel(sample).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { a: 1, b: 2, c: 3 },
      { a: 4, b: 5, c: 6 },
      { a: 7, b: 8, c: 9 }
    ])
  })
  it('should parse a basic list with autoFormat aggressive', async () => {
    const sample = [
      { 'received at': 1, 'performed at': 2, called_at: 3 },
      { 'received at': '4', 'performed at': '5', called_at: '6' },
      { 'received at': 7, 'performed at': 8, called_at: 9 }
    ]
    const parser = parse('excel', { autoFormat: 'aggressive' })
    const stream = arrToExcel(sample).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      { receivedAt: 1, performedAt: 2, calledAt: 3 },
      { receivedAt: 4, performedAt: 5, calledAt: 6 },
      { receivedAt: 7, performedAt: 8, calledAt: 9 }
    ])
  })
  it('should parse a basic file', async () => {
    const parser = parse('excel')
    const stream = createReadStream(xlsxFixture).pipe(parser())
    const res = await collect.array(stream)
    res.should.eql([
      {
        row: 'row1',
        date: new Date('2017-02-08T00:00:00.000Z'),
        cost: 100,
        notes: 111
      },
      {
        row: 'row2',
        date: new Date('2017-02-08T00:00:00.000Z'),
        cost: 300,
        notes: 222
      },
      {
        row: 'row3',
        date: new Date('2017-02-08T00:00:00.000Z'),
        cost: 4,
        notes: 333
      },
      {
        row: 'row4',
        date: new Date('2017-02-08T00:00:00.000Z'),
        cost: 53,
        notes: 444
      }
    ])
  })
  it('should parse another basic file', async () => {
    const parser = parse('excel')
    const stream = createReadStream(xlsxFixture2).pipe(parser())
    const res = await collect.array(stream)
    should.exist(res[0])
  })
  it('should return a friendly error when unsupported XLS file is used', (done) => {
    const parser = parse('excel', { autoFormat: 'simple' })
    const stream = createReadStream(xlsFixture).pipe(parser())
    collect.array(stream)
      .catch((err) => {
        should.exist(err)
        err.message.should.equal('Legacy XLS files are not supported, use an XLSX file instead!')
        done()
      })
  })
})

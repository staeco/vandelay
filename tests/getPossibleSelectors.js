/*eslint no-console: 0*/

import should from 'should'
import { join } from 'path'
import { createReadStream } from 'graceful-fs'
import streamify from 'into-stream'
import collect from 'get-stream'
import getPossibleSelectors from '../src/getPossibleSelectors'

const xlsFixture = join(__dirname, './fixtures/xlsx-fixture.xlsx')

describe('getPossibleSelectors', () => {
  it('should error with invalid format', async () => {
    should.throws(() => getPossibleSelectors({ parser: 'dummy' }))
  })
  it('should work with json', async () => {
    const data = { a: [ { b: 1 }, { a: 2 }, { b: 3 } ] }
    const sample = JSON.stringify(data)
    const stream = streamify(sample).pipe(getPossibleSelectors('json'))
    const res = await collect.array(stream)
    res.should.eql([
      'a.*',
      '*'
    ])
  })
  it('should work with excel', async () => {
    const stream = createReadStream(xlsFixture).pipe(getPossibleSelectors('excel'))
    const res = await collect.array(stream)
    res.should.eql([
      '*',
      'Sheet1'
    ])
  })
  it('should work with html', async () => {
    const data = `
    <html>
    <item>
      <A>1</A>
      <B>2</B>
      <C>3</C>
    </item>
    <item>
      <A>4</A>
      <B>5</B>
      <C>6</C>
    </item>
    <item>
      <A>7</A>
      <B>8</B>
      <C>9</C>
    </item>
    </html>`
    const stream = streamify(data).pipe(getPossibleSelectors('html'))
    const res = await collect.array(stream)
    res.should.eql([
      'html.item.*',
      'html.*',
      '*'
    ])
  })
  it('should work with xml', async () => {
    const data = `<root>
    <item>
      <A>1</A>
      <B>2</B>
      <C>3</C>
    </item>
    <item>
      <A>4</A>
      <B>5</B>
      <C>6</C>
    </item>
    <item>
      <A>7</A>
      <B>8</B>
      <C>9</C>
    </item>
    </root>`
    const stream = streamify(data).pipe(getPossibleSelectors('html'))
    const res = await collect.array(stream)
    res.should.eql([
      'root.item.*',
      'root.*',
      '*'
    ])
  })
})

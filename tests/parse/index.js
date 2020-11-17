/*eslint no-console: 0*/

import should from 'should'
import parse from '../../src/parse'

describe('parse', () => {
  it('should return type functions', async () => {
    should.equal(typeof parse('json', { selector: '*' }), 'function')
    should.equal(typeof parse('xml', { selector: '*' }), 'function')
    should.equal(typeof parse('csv'), 'function')
    should.equal(typeof parse('excel'), 'function')
    should.equal(typeof parse('shp'), 'function')
  })
})

/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const proxyquire = require('proxyquire')
const expect = chai.expect

describe('Symbol Check', () => {
  it('should return true for a paper mode symbol', () => {
    const symbol = 'symbol1'
    const PAPER_MODE_PAIRS = ['symbol1']
    const symbolCheck = proxyquire('../../../../lib/util/is_paper_mode', {
      '../constants': { PAPER_MODE_PAIRS }
    })
    const result = symbolCheck(symbol)
    expect(result).to.be.true
  })

  it('should return false for a non-paper mode symbol', () => {
    const symbol = 'symbol2'
    const PAPER_MODE_PAIRS = ['symbol1']
    const symbolCheck = proxyquire('../../../../lib/util/is_paper_mode', {
      '../constants': { PAPER_MODE_PAIRS }
    })
    const result = symbolCheck(symbol)
    expect(result).to.be.false
  })
})

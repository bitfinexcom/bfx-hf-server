/* eslint-disable no-unused-expressions */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const proxyquire = require('proxyquire')
const expect = chai.expect

describe('Symbol Check', () => {
  it('should return true for a paper mode symbol', () => {
    const symbol = 'tTESTBTC:TESTUSD'
    const PAPER_PAIR_PREFIX = 'TEST'
    const symbolCheck = proxyquire('../../../../lib/util/is_paper_pair', {
      '../constants': { PAPER_PAIR_PREFIX }

    })
    const result = symbolCheck(symbol)
    expect(result).to.be.true
  })

  it('should return false for a non-paper mode symbol', () => {
    const symbol = 'tBTC:USD'
    const PAPER_PAIR_PREFIX = 'TEST'
    const symbolCheck = proxyquire('../../../../lib/util/is_paper_pair', {
      '../constants': { PAPER_PAIR_PREFIX }

    })
    const result = symbolCheck(symbol)
    expect(result).to.be.false
  })
})

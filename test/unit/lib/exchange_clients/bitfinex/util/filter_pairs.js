/* eslint-env mocha */
'use strict'

const assert = require('assert')

const filterPairs = require('exchange_clients/bitfinex/util/filter_pairs.js')

describe('filter pairs', () => {
  it('filters out paper trading pairs', () => {
    const exclude = [
      'AAA', 'BBB', 'TESTBTC', 'TESTBTCF0',
      'TESTUSD', 'TESTUSDT', 'TESTUSDTF0'
    ]

    const symbols = [
      'AAABBB', 'TESTBTCF0:TESTUSDTF0', 'FOO:TESTBTC',
      'BTCUSD', 'ETHUSD', 'XAUTF0:USTF0'
    ]

    const res = filterPairs(symbols, exclude)
    assert.deepStrictEqual(res, ['BTCUSD', 'ETHUSD', 'XAUTF0:USTF0'])
  })

  it('greps paper trading pairs', () => {
    const include = [
      'AAA', 'BBB', 'TESTBTC', 'TESTBTCF0',
      'TESTUSD', 'TESTUSDT', 'TESTUSDTF0'
    ]

    const symbols = [
      'AAABBB', 'TESTBTCF0:TESTUSDTF0', 'FOO:TESTBTC',
      'BTCUSD', 'ETHUSD', 'XAUTF0:USTF0'
    ]

    const res = filterPairs(symbols, include, true)
    assert.deepStrictEqual(res, [
      'AAABBB',
      'TESTBTCF0:TESTUSDTF0',
      'FOO:TESTBTC'
    ])
  })
})

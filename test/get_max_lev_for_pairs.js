/* eslint-env mocha */
'use strict'

const assert = require('assert')

const getMaxLevForPairs = require('../lib/exchange_clients/bitfinex/util/get_max_lev_for_pairs.js')

describe('get max leverage value for pairs', () => {
  it('calculates the max leverage value for margin and future pairs', () => {
    const futureAndMarginConf = [
      { initial: { 'BTCF0:USTF0': 0.01 } },
      { initial: { BTCUSD: 0.2, SANUSD: 0.3 } }
    ]

    const res = getMaxLevForPairs(futureAndMarginConf)
    assert.deepStrictEqual(res.size, 3)
    assert.deepStrictEqual(res.get('BTCF0:USTF0'), 100)
    assert.deepStrictEqual(res.get('BTCUSD'), 5)
    assert.deepStrictEqual(res.get('SANUSD'), 3.33)
  })
})

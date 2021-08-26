/* eslint-env mocha */
'use strict'

const assert = require('assert')

const getMinMaxSizeForPairs = require('exchange_clients/bitfinex/util/get_min_max_size_for_pairs.js')

describe('get min and max size for all pairs', () => {
  it('fetches the min and max size for all pairs', () => {
    const pairConf = [
      [
        [
          'ETHUSD',
          [null, null, null, '0.006', '5000.0']
        ],
        [
          'BTCUSD',
          [null, null, null, '0.0002', '2000.0']
        ]
      ],
      [
        [
          'BTCDOMF0:USTF0',
          [null, null, null, '0.02', '100.0']
        ]
      ]
    ]

    const res = getMinMaxSizeForPairs(pairConf)
    assert.deepStrictEqual(res.size, 3)
    assert.deepStrictEqual(res.get('ETHUSD').minSize, 0.006)
    assert.deepStrictEqual(res.get('ETHUSD').maxSize, 5000)
    assert.deepStrictEqual(res.get('BTCUSD').minSize, 0.0002)
    assert.deepStrictEqual(res.get('BTCUSD').maxSize, 2000)
    assert.deepStrictEqual(res.get('BTCDOMF0:USTF0').minSize, 0.02)
    assert.deepStrictEqual(res.get('BTCDOMF0:USTF0').maxSize, 100)
  })
})

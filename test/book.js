/* eslint-env mocha */
'use strict'

const assert = require('assert')

const updateBook = require('../lib/exchange_clients/bitfinex/recv/data_handlers/book.js')

describe('order books', () => {
  it('does not crash: empty snapshot and update following', () => {
    const msg1 = [12282, []]
    const msg2 = [12295, [4000, 1, -1]]

    const opts = { books: {}, lastBookPacketSent: {} }
    updateBook(opts, msg1, { symbol: 'tBTCUSD' })
    updateBook(opts, msg2, { symbol: 'tBTCUSD' })

    assert.deepStrictEqual(opts.books, { tBTCUSD: [[4000, 1, -1]] })
  })
})

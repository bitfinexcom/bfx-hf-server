'use strict'

const _last = require('lodash/last')
const _isArray = require('lodash/isArray')
const { OrderBook } = require('bfx-api-node-models')
const bookTransformer = require('../../transformers/book')

const BOOK_PACKET_SEND_INTERVAL_MS = 1000

module.exports = (exa, msg, channel) => {
  const { books, lastBookPacketSent } = exa

  const lastElement = _last(msg)
  const isEmptySnap = _isArray(lastElement) && lastElement.length === 0

  if (_isArray(lastElement[0]) || isEmptySnap) {
    books[channel.symbol] = lastElement
  } else {
    OrderBook.updateArrayOBWith(books[channel.symbol], lastElement)
  }

  const lastSend = lastBookPacketSent[channel.symbol]

  if (!lastSend || Date.now() > lastSend + BOOK_PACKET_SEND_INTERVAL_MS) {
    lastBookPacketSent[channel.symbol] = Date.now()

    return [['full', bookTransformer(books[channel.symbol])]]
  }

  return []
}

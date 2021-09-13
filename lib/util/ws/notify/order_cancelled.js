'use strict'

const _lowerCase = require('lodash/lowerCase')
const notifyInfo = require('./info')
const format = require('./util/format')

module.exports = (ws, exID, order) => {
  const { id, originalAmount, symbol, type } = order

  notifyInfo(ws, format([
    exID, _lowerCase(type), originalAmount > 0 ? 'BUY' : 'SELL',
    'order of', Math.abs(+originalAmount), symbol, 'has been canceled',
    `(ID: ${id})`
  ]), [
    originalAmount > 0 ? 'orderCancelledBuy.detailed' : 'orderCancelledSell.detailed', {
      exID,
      type,
      symbol,
      amount: Math.abs(+originalAmount),
      id
    }
  ])
}

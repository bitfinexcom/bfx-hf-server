'use strict'

const _lowerCase = require('lodash/lowerCase')
const notifyInfo = require('./info')
const format = require('./util/format')

module.exports = (ws, exID, order) => {
  const { id, amountOrig, symbol, type } = order

  notifyInfo(ws, format([
    exID, _lowerCase(type), amountOrig > 0 ? 'BUY' : 'SELL',
    'order of', Math.abs(+amountOrig), symbol, 'has been canceled',
    `(ID: ${id})`
  ]), [
    amountOrig > 0 ? 'orderCancelledBuyDetailed' : 'orderCancelledSellDetailed', {
      exID,
      type,
      symbol,
      amount: Math.abs(+amountOrig),
      id
    }
  ])
}

'use strict'

const _isFinite = require('lodash/isFinite')
const _lowerCase = require('lodash/lowerCase')
const notifySuccess = require('./success')
const format = require('./util/format')

module.exports = (ws, exID, order) => {
  const { id, amountOrig, symbol, price, type } = order

  notifySuccess(ws, format([
    exID, _lowerCase(type), amountOrig > 0 ? 'BUY' : 'SELL',
    'order of', _isFinite(+amountOrig) && Math.abs(+amountOrig), symbol,
    'has been fully executed', isFinite(+price) && +price > 0 && ['at', price],
    `(ID: ${id})`
  ]), [
    `orderExecuted${amountOrig > 0 ? 'Buy' : 'Sell'}${isFinite(+price) && +price > 0 ? 'At' : ''}Detailed`, {
      exID,
      type,
      symbol,
      price,
      amount: Math.abs(+amountOrig),
      id
    }
  ])
}

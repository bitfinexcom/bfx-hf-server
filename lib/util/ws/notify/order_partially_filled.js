'use strict'

const _isFinite = require('lodash/isFinite')
const _lowerCase = require('lodash/lowerCase')
const notifyInfo = require('./info')
const format = require('./util/format')

module.exports = (ws, exID, order) => {
  const { id, amount, originalAmount, price, symbol, type } = order

  notifyInfo(ws, format([
    exID, _lowerCase(type), originalAmount > 0 ? 'BUY' : 'SELL',
    'order of', Math.abs(+originalAmount), symbol, 'partially filled',
    _isFinite(+amount) && _isFinite(+price) && +price > 0 && ['at', price],
    `(ID: ${id})`
  ]), [
    `orderPartiallyFilled${originalAmount > 0 ? 'Buy' : 'Sell'}Detailed`, {
      exID,
      type,
      symbol,
      amount: Math.abs(+originalAmount),
      price,
      id
    }
  ])
}

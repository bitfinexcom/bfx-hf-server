'use strict'

const _isFinite = require('lodash/isFinite')
const _lowerCase = require('lodash/lowerCase')
const notifySuccess = require('./success')
const format = require('./util/format')

module.exports = (ws, exID, order) => {
  const { id, amount, originalAmount, price, symbol, type } = order
  const hasPrice = _isFinite(+amount) && _isFinite(+price) && +price > 0

  notifySuccess(ws, format([
    exID, _lowerCase(type), originalAmount > 0 ? 'BUY' : 'SELL',
    'order of', Math.abs(+originalAmount), symbol, 'partially filled',
    hasPrice && ['at', price],
    `(ID: ${id})`
  ]), [
    `orderPartiallyFilled${originalAmount > 0 ? 'Buy' : 'Sell'}${hasPrice ? 'At' : ''}Detailed`, {
      exID,
      type,
      symbol,
      amount: Math.abs(+originalAmount),
      price,
      id
    }
  ])
}

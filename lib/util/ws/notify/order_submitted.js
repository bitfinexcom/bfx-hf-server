'use strict'

const _isFinite = require('lodash/isFinite')
const _lowerCase = require('lodash/lowerCase')
const notifySuccess = require('./success')
const format = require('./util/format')

module.exports = (ws, exID, order) => {
  const { id, amount, symbol, price, type } = order

  notifySuccess(ws, format([
    'Created ', exID, _lowerCase(type), amount > 0 ? 'BUY' : 'SELL',
    'order of', _isFinite(+amount) && amount, symbol,
    _isFinite(+amount) && _isFinite(+price) && +price > 0 && ['at', price],
    `(ID: ${id})`
  ]))
}

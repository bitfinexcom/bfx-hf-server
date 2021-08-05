'use strict'

const _flatten = require('lodash/flatten')
const _isFinite = require('lodash/isFinite')
const _capitalize = require('lodash/capitalize')
const _lowerCase = require('lodash/lowerCase')
const notifySuccess = require('./success')

module.exports = (ws, exID, order) => {
  const { id, amount, symbol, price, type } = order

  notifySuccess(ws, _flatten([
    _capitalize(exID), _lowerCase(type), amount > 0 ? 'BUY' : 'SELL',
    'order of', _isFinite(+amount) && +amount, symbol,
    'has been fully executed', isFinite(+price) && +price > 0 && ['at', price],
    `(ID: ${id})`
  ]).filter(t => !!t).join(' '))
}

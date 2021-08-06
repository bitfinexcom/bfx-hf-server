'use strict'

const _capitalize = require('lodash/capitalize')
const _lowerCase = require('lodash/lowerCase')
const notifyInfo = require('./info')

module.exports = (ws, exID, order) => {
  const { id, amount, symbol, type } = order

  notifyInfo(ws, [
    _capitalize(exID), _lowerCase(type), amount > 0 ? 'BUY' : 'SELL',
    'order of', +amount, symbol, 'has been canceled',
    `(ID: ${id})`
  ].join(' '))
}

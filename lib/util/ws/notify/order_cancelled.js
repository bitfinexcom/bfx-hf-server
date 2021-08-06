'use strict'

const _lowerCase = require('lodash/lowerCase')
const notifyInfo = require('./info')
const format = require('./util/format')

module.exports = (ws, exID, order) => {
  const { id, amount, symbol, type } = order

  notifyInfo(ws, format([
    exID, _lowerCase(type), amount > 0 ? 'BUY' : 'SELL',
    'order of', +amount, symbol, 'has been canceled',
    `(ID: ${id})`
  ]))
}

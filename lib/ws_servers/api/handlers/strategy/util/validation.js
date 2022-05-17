'use strict'

const _isString = require('lodash/isString')
const _isFinite = require('lodash/isFinite')
const _isBoolean = require('lodash/isBoolean')
const { candleWidth } = require('bfx-hf-util')

module.exports = ({ label, symbol, tf, includeTrades, seedCandleCount, margin }) => {
  if (!_isString(label)) {
    return 'Label is not a string'
  } else if (!_isString(symbol)) {
    return 'Symbol is not a string'
  } else if (!_isFinite(candleWidth(tf))) {
    return 'Invalid timeframe'
  } else if (!_isBoolean(includeTrades)) {
    return 'Invalid includeTrades flag'
  } else if (!_isFinite(seedCandleCount)) {
    return 'Invalid seed candle count'
  } else if (!_isBoolean(margin)) {
    return 'Exchange/Margin trading value must be a boolean'
  }

  return null
}

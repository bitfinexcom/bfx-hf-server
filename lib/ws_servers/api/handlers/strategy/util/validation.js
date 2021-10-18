'use strict'

const _isString = require('lodash/isString')
const _isFinite = require('lodash/isFinite')
const _isBoolean = require('lodash/isBoolean')
const { candleWidth } = require('bfx-hf-util')

module.exports = ({ symbol, tf, includeTrades, seedCandleCount }) => {
  if (!_isString(symbol)) {
    return 'Symbol not a string'
  } else if (!_isFinite(candleWidth(tf))) {
    return 'Invalid timeframe'
  } else if (!_isBoolean(includeTrades)) {
    return 'Invalid includeTrades flag'
  } else if (!isFinite(seedCandleCount)) {
    return 'Invalid seed candle count'
  }

  return null
}

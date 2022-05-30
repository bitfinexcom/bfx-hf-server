'use strict'

const _isString = require('lodash/isString')
const _isFinite = require('lodash/isFinite')
const _isBoolean = require('lodash/isBoolean')
const { candleWidth } = require('bfx-hf-util')
const EXIT_MODES = require('bfx-hf-strategy-perf/src/ExitModes')

module.exports = ({
  label,
  symbol,
  tf,
  includeTrades,
  seedCandleCount,
  margin,
  allocation,
  maxPositionSize,
  maxDrawdown,
  absStopLoss,
  percStopLoss,
  exitPositionMode
}) => {
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
  } else if (!_isFinite(allocation)) {
    return 'Invalid strategy allocation'
  } else if (maxPositionSize && !_isFinite(maxPositionSize)) {
    return 'Invalid max position size'
  } else if (maxDrawdown && !_isFinite(maxDrawdown)) {
    return 'Invalid max drawdown'
  } else if (absStopLoss && !_isFinite(absStopLoss)) {
    return 'Invalid absolute stop loss'
  } else if (percStopLoss && !_isFinite(percStopLoss)) {
    return 'Invalid percentage stop loss'
  } else if (exitPositionMode && (maxDrawdown || absStopLoss || percStopLoss) && !EXIT_MODES[exitPositionMode]) {
    return 'Invalid exit position mode'
  }

  return null
}

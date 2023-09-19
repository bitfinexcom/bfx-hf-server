'use strict'

const _isNil = require('lodash/isNil')
const _isString = require('lodash/isString')
const _isFinite = require('lodash/isFinite')
const _isBoolean = require('lodash/isBoolean')
const _isPlainObject = require('lodash/isPlainObject')

const { candleWidth } = require('bfx-hf-util')

module.exports = ({
  strategyId,
  label,
  symbol,
  timeframe,
  trades,
  candleSeed,
  margin,
  strategyType,
  capitalAllocation,
  stopLossPerc,
  maxDrawdownPerc,
  useMaxLeverage,
  leverage,
  increaseLeverage,
  addStopOrder,
  stopOrderPercent
}) => {
  if (!_isString(strategyId)) {
    return 'Strategy id is not a string'
  } else if (!_isString(label)) {
    return 'Label is not a string'
  } else if (!_isString(symbol)) {
    return 'Symbol is not a string'
  } else if (!_isFinite(candleWidth(timeframe))) {
    return 'Invalid timeframe'
  } else if (!_isBoolean(trades)) {
    return 'Invalid trades flag'
  } else if (!_isFinite(candleSeed)) {
    return 'Invalid seed candle count'
  } else if (!_isBoolean(margin)) {
    return 'Exchange/Margin trading value must be a boolean'
  } else if (!_isNil(strategyType) && !_isPlainObject(strategyType)) {
    return 'Invalid strategy type'
  } else if (!_isFinite(capitalAllocation)) {
    return 'Invalid strategy allocation'
  } else if (maxDrawdownPerc && !_isFinite(maxDrawdownPerc)) {
    return 'Invalid max drawdown'
  } else if (stopLossPerc && !_isFinite(stopLossPerc)) {
    return 'Invalid percentage stop loss'
  } else if (!_isBoolean(useMaxLeverage)) {
    return 'Always use maximum leverage must be a boolean'
  } else if (!useMaxLeverage && !_isFinite(leverage)) {
    return 'Invalid leverage value'
  } else if (!_isBoolean(increaseLeverage)) {
    return 'Increase leverage if required must be a boolean'
  } else if (!_isBoolean(addStopOrder)) {
    return 'Automatically add a Stop order must be a boolean'
  } else if (addStopOrder && !_isFinite(stopOrderPercent)) {
    return 'Invalid Stop order percent value'
  }

  return null
}

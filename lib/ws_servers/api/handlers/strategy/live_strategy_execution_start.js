'use strict'

const HFS = require('bfx-hf-strategy')
const Indicators = require('bfx-hf-indicators')
const send = require('../../../../util/ws/send')
const validateStrategyArgs = require('./util/validation')
const sendError = require('../../../../util/ws/send_error')
const isAuthorized = require('../../../../util/ws/is_authorized')
const parseStrategy = require('bfx-hf-strategy/lib/util/parse_strategy')

module.exports = async (server, ws, msg) => {
  const [
    , authToken, strategyId, label, symbol, timeframe, trades,
    strategyContent, strategyType, candleSeed, margin,
    constraints = {}, leverageSettings = {}, stopOrderSettings = {}
  ] = msg

  const sendLiveExecutionSubmitStatus = (status, strategyMapKey = null) => {
    send(ws, ['strategy.start_live_execution_submit_status', status, strategyMapKey])
  }

  const err = validateStrategyArgs({
    strategyId,
    label,
    symbol,
    timeframe,
    trades,
    candleSeed,
    margin,
    strategyType,
    ...constraints,
    ...leverageSettings,
    ...stopOrderSettings
  })
  if (err) {
    sendLiveExecutionSubmitStatus(false)
    return sendError(ws, err)
  }

  const strategyManager = ws.getStrategyManager()

  if (!isAuthorized(ws, authToken)) {
    sendLiveExecutionSubmitStatus(false)
    return sendError(ws, 'Unauthorized')
  } else if (!strategyManager) {
    sendLiveExecutionSubmitStatus(false)
    return sendError(ws, 'Strategy manager is not ready')
  }

  let strategy
  try {
    strategy = parseStrategy(strategyContent)
  } catch (e) {
    console.log(e)
    sendLiveExecutionSubmitStatus(false)
    return sendError(ws, 'Strategy could not get parsed - parse error')
  }

  try {
    const indicators = strategy.defineIndicators
      ? strategy.defineIndicators(Indicators)
      : {}

    strategy = HFS.define({
      ...strategy,
      label,
      margin,
      tf: timeframe,
      symbol,
      indicators
    })
  } catch (e) {
    console.log(e)
    sendLiveExecutionSubmitStatus(false)
    return sendError(ws, 'Strategy is invalid')
  }

  const { id: strategyMapKey } = strategy
  const { apiKey, apiSecret } = ws.getCredentials()

  const { marketData } = server
  const symbolConfig = marketData.get(symbol)
  const isDerivative = symbolConfig.contexts.includes('f')
  const maxLeverage = symbolConfig.lev
  const baseCurrency = symbolConfig.base
  const quoteCurrency = symbolConfig.quote

  try {
    await strategyManager.start({ apiKey, apiSecret })

    sendLiveExecutionSubmitStatus(true, strategyMapKey)

    // execute strategy
    await strategyManager.execute(strategy, {
      strategyId,
      label,
      symbol,
      timeframe,
      trades,
      candleSeed,
      margin,
      strategyType,
      isDerivative,
      baseCurrency,
      quoteCurrency,
      maxLeverage,
      ...constraints,
      ...leverageSettings,
      ...stopOrderSettings
    })
  } catch (err) {
    sendLiveExecutionSubmitStatus(false, strategyMapKey)
    sendError(ws, `Strategy error: ${err.msg || err.message}`)
    await strategyManager.close(strategyMapKey)
  }
}

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
    , authToken, label, symbol, timeframe, trades,
    strategyContent, candleSeed, margin, constraints = {}
  ] = msg

  const sendLiveExecutionSubmitStatus = (status, strategyMapKey = null) => {
    send(ws, ['strategy.start_live_execution_submit_status', status, strategyMapKey])
  }

  const err = validateStrategyArgs({
    label,
    symbol,
    timeframe,
    trades,
    candleSeed,
    margin,
    ...constraints
  })
  if (err) {
    sendLiveExecutionSubmitStatus(false)
    return sendError(ws, err)
  }

  if (!isAuthorized(ws, authToken)) {
    sendLiveExecutionSubmitStatus(false)
    return sendError(ws, 'Unauthorized')
  } else if (!ws.strategyManager) {
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
    strategy = HFS.define({
      ...strategy,
      label,
      margin,
      tf: timeframe,
      symbol,
      indicators: {
        ...strategy.defineIndicators(Indicators)
      }
    })
  } catch (e) {
    console.log(e)
    sendLiveExecutionSubmitStatus(false)
    return sendError(ws, 'Strategy is invalid')
  }

  const { id: strategyMapKey } = strategy
  const { id: strategyId, strategyOptions = {} } = strategyContent
  const { strategyType } = strategyOptions
  const { key, secret } = ws.bitfinexCredentials

  try {
    await ws.strategyManager.start({ apiKey: key, apiSecret: secret })

    sendLiveExecutionSubmitStatus(true, strategyMapKey)

    // execute strategy
    await ws.strategyManager.execute(strategy, {
      strategyId,
      label,
      symbol,
      timeframe,
      trades,
      candleSeed,
      margin,
      strategyType,
      ...constraints
    })
  } catch (err) {
    sendLiveExecutionSubmitStatus(false, strategyMapKey)
    sendError(ws, `Strategy error: ${err.msg || err.message}`)
    await ws.strategyManager.close(strategyMapKey)
  }
}

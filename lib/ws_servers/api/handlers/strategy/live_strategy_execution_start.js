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
    , authToken, name, symbol, tf, includeTrades,
    strategyContent, seedCandleCount, margin
  ] = msg

  const sendLiveExecutionSubmitStatus = (status) => {
    send(ws, ['strategy.start_live_execution_submit_status', status])
  }

  const err = validateStrategyArgs({ name, symbol, tf, includeTrades, seedCandleCount, margin })
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
      name,
      margin,
      tf,
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

  const { key, secret } = ws.bitfinexCredentials
  try {
    await ws.strategyManager.start({ apiKey: key, apiSecret: secret })

    // execute strategy
    await ws.strategyManager.execute(strategy, {
      id: strategyContent.id,
      name,
      symbol,
      tf,
      includeTrades,
      seedCandleCount,
      margin
    })
  } catch (err) {
    sendLiveExecutionSubmitStatus(false)
    return sendError(ws, `Strategy error: ${err.msg || err.message}`)
  }

  sendLiveExecutionSubmitStatus(true)
}

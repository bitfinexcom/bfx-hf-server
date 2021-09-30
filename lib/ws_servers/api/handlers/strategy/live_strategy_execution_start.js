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
    , authToken, symbol, tf, includeTrades,
    strategyContent, seedCandleCount
  ] = msg

  const sendLiveExecutionSubmitStatus = (status) => {
    send(ws, ['strategy.start_live_execution_submit_status', status])
  }

  const err = validateStrategyArgs({ symbol, tf, includeTrades, seedCandleCount })
  if (err) {
    sendLiveExecutionSubmitStatus(false)
    return sendError(ws, err)
  }

  if (!isAuthorized(ws, authToken)) {
    sendLiveExecutionSubmitStatus(false)
    return sendError(ws, 'Unauthorized')
  } else if (!ws.strategyManager) {
    sendLiveExecutionSubmitStatus(false)
    return sendError(ws, `Strategy manager is not ready`)
  } else if (ws.strategyManager.isActive()) {
    return sendError(ws, `Currently running a strategy. Can't execute a new strategy`)
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
  } catch(err) {
    sendLiveExecutionSubmitStatus(false)
    return sendError(ws, `strategy error: ${err.msg}`)
  }

  await ws.strategyManager.execute(strategy, {
    id: strategyContent.id,
    symbol,
    tf,
    includeTrades,
    seedCandleCount
  })

  sendLiveExecutionSubmitStatus(true)
}

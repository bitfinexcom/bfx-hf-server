'use strict'

const send = require('../../../../util/ws/send')
const sendError = require('../../../../util/ws/send_error')
const isAuthorized = require('../../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const [, authToken] = msg

  if (!isAuthorized(ws, authToken)) {
    send(ws, ['strategy.live_execution_status', false, {}])
    return sendError(ws, 'Unauthorized')
  }

  const isStrategyRunning = !!ws.strategyManager && ws.strategyManager.isActive()

  send(ws, [
    'strategy.live_execution_status',
    isStrategyRunning,
    isStrategyRunning ? ws.strategyManager.getStrategyArgs() : {}
  ])
}

'use strict'

const _isString = require('lodash/isString')
const send = require('../../../../util/ws/send')
const sendError = require('../../../../util/ws/send_error')
const isAuthorized = require('../../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const [, authToken, strategyMapKey] = msg

  const sendStopLiveExecutionSubmitStatus = (status) => {
    send(ws, ['strategy.stop_live_execution_submit_status', status])
  }

  if (!_isString(strategyMapKey)) {
    sendStopLiveExecutionSubmitStatus(false)
    return sendError(ws, 'Invalid strategy key')
  }

  if (!isAuthorized(ws, authToken)) {
    sendStopLiveExecutionSubmitStatus(false)
    return sendError(ws, 'Unauthorized')
  } else if (!ws.strategyManager) {
    sendStopLiveExecutionSubmitStatus(false)
    return sendError(ws, 'Strategy manager is not ready')
  } else if (!ws.strategyManager.isActive(strategyMapKey)) {
    sendStopLiveExecutionSubmitStatus(false)
    return sendError(ws, 'No such strategy is currently running')
  }

  await ws.strategyManager.close(strategyMapKey)

  sendStopLiveExecutionSubmitStatus(true)
}

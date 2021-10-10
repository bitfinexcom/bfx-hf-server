'use strict'

const send = require('../../../../util/ws/send')
const sendError = require('../../../../util/ws/send_error')
const isAuthorized = require('../../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const [, authToken] = msg

  const sendStopLiveExecutionSubmitStatus = (status) => {
    send(ws, ['strategy.stop_live_execution_submit_status', status])
  }

  if (!isAuthorized(ws, authToken)) {
    sendStopLiveExecutionSubmitStatus(false)
    return sendError(ws, 'Unauthorized')
  } else if (!ws.strategyManager) {
    sendStopLiveExecutionSubmitStatus(false)
    return sendError(ws, 'Strategy manager is not ready')
  } else if (!ws.strategyManager.isActive()) {
    sendStopLiveExecutionSubmitStatus(false)
    return sendError(ws, 'No strategy is currently running')
  }

  ws.strategyManager.close()

  sendStopLiveExecutionSubmitStatus(true)
}

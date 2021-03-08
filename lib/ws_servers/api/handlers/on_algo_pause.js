'use strict'

const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const [, authToken] = msg
  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken }
  })

  if (!validRequest) {
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  ws.aoc.pause('bitfinex')
}

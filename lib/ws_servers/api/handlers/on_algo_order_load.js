'use strict'

const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const { d } = server
  const [, authToken, orders] = msg

  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    orders: { type: 'array', v: orders }
  })

  if (!validRequest) {
    d('invalid request: algo:load')
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  console.log('ONLOAD')

  ws.aoc.loadAOs(orders)
}

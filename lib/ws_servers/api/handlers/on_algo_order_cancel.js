'use strict'

const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const [, authToken, exID, gid] = msg
  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    authToken: { type: 'string', v: authToken },
    gid: { type: 'string', v: gid }
  })

  if (!validRequest) {
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  } else if (exID !== 'bitfinex') {
    return sendError(ws, 'Algo orders currently only enabled for Bitfinex')
  } else if (!ws.aoc) {
    return sendError(ws, 'Unauthorized')
  }

  ws.aoc.stopAO(exID, gid)
}

'use strict'

const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const [, authToken, exID, aoID, packet] = msg
  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    authToken: { type: 'string', v: authToken },
    aoID: { type: 'string', v: aoID },
    packet: { type: 'object', v: packet }
  })

  if (!validRequest) {
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  } else if (exID !== 'bitfinex' && exID !== 'binance') {
    return sendError(ws, 'Algo orders currently only enabled for Bitfinex and Binance')
  } else if (!ws.aoc) {
    return sendError(ws, 'Unauthorized')
  }

  ws.aoc.startAO(exID, aoID, packet)
}

'use strict'

const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const { algoDB, as } = server

  const [, authToken, exID, orders] = msg

  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    authToken: { type: 'string', v: authToken },
    orders: { type: 'array', v: orders }
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

  for (const algOrder of orders) {
    const { gid, algoID } = algOrder
    const { AlgoOrder } = algoDB
    await AlgoOrder.update({ gid, algoID }, { active: false })
  }

  as.open()
}

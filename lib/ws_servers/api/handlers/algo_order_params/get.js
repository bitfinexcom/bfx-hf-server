'use strict'

const send = require('../../../../util/ws/send')
const sendError = require('../../../../util/ws/send_error')
const isAuthorized = require('../../../../util/ws/is_authorized')
const validateParams = require('../../../../util/ws/validate_params')

module.exports = async (server, ws, msg) => {
  const { d, db } = server
  const [, authToken, algoID, symbol] = msg

  const validRequest = validateParams(ws, {
    algoID: { type: 'string', v: algoID },
    symbol: { type: 'string', v: symbol }
  })

  if (!validRequest) {
    d('error: Invalid request params while fetching algo order parameters')
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const { AlgoOrderParams } = db

  const data = await AlgoOrderParams.find([
    ['algoID', '=', algoID],
    ['symbol', '=', symbol]
  ])

  send(ws, ['data.algo_order_params', data])
}

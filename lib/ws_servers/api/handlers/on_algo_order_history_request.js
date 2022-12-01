'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const { d, algoDB } = server
  const { AlgoOrder } = algoDB

  const [, authToken] = msg

  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken }
  })

  if (!validRequest) {
    d('invalid request: algo:order_history')
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  }

  try {
    const algoOrders = await AlgoOrder.find([['active', '=', false]])
    send(ws, ['algo.order_history_loaded', algoOrders || []])
  } catch (err) {
    d('invalid request: algo_order_history_request')
    sendError(ws, err.message)
  }
}

'use strict'

const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const recurringAOCancelHandler = require('./on_recurring_algo_order_cancel')

module.exports = async (server, ws, msg) => {
  const { algoDB } = server
  const { AlgoOrder } = algoDB
  const [, authToken, exID, gid] = msg

  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    authToken: { type: 'string', v: authToken },
    gid: { type: 'string', v: gid }
  })

  if (!validRequest) {
    return
  }

  const { recurringAlgoOrderId } = await AlgoOrder.get({ gid })
  if (recurringAlgoOrderId) {
    return recurringAOCancelHandler(server, ws, [null, authToken, exID, recurringAlgoOrderId])
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  } else if (exID !== 'bitfinex') {
    return sendError(ws, 'Algo orders currently only enabled for Bitfinex', ['algoOrdersCurrentlyOnlyEnabledFor', { target: 'Bitfinex' }])
  }

  try {
    await ws.getAlgoWorker().cancelOrder(gid)
  } catch (e) {
    return sendError(ws, e.message, e.i18n)
  }
}

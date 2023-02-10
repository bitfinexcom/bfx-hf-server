'use strict'

const { Recurring } = require('bfx-hf-algo')
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

  const algoOrder = await AlgoOrder.get({ gid, algoID: Recurring.id })
  if (algoOrder && algoOrder.recurringAlgoOrderId) {
    return recurringAOCancelHandler(server, ws, [null, authToken, exID, algoOrder.recurringAlgoOrderId, gid])
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

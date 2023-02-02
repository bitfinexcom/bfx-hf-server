'use strict'

const sendError = require('../../../util/ws/send_error')
const send = require('../../../util/ws/send')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const recurringAOSubmitHandler = require('./on_recurring_algo_order_submit')

module.exports = async (server, ws, msg) => {
  const [, authToken, exID, aoID, packet] = msg

  if (aoID === 'Recurring.id') {
    return await recurringAOSubmitHandler(server, ws, msg)
  }

  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    authToken: { type: 'string', v: authToken },
    aoID: { type: 'string', v: aoID },
    packet: { type: 'object', v: packet }
  })
  const sendStatus = (status) => send(ws, ['data.algo_order.submit_status', status, aoID])

  if (!validRequest) {
    sendStatus('failed')
    return
  }

  if (!isAuthorized(ws, authToken)) {
    sendStatus('failed')
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  } else if (exID !== 'bitfinex') {
    sendStatus('failed')
    return sendError(ws, 'Algo orders currently only enabled for Bitfinex', ['algoOrdersCurrentlyOnlyEnabledFor', { target: 'Bitfinex' }])
  }

  try {
    await ws.getAlgoWorker().submitOrder(aoID, packet)
    sendStatus('success')
  } catch (e) {
    sendStatus('failed')
    return sendError(ws, e.message, e.i18n)
  }
}

'use strict'

const { RESTv2 } = require('bfx-api-node-rest')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const send = require('../../../util/ws/send')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const { mode } = ws
  const { d, restURL } = server
  const { apiKey, apiSecret } = ws.getCredentials()

  const [, authToken, exID, payload] = msg

  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    payload: { type: 'object', v: payload }
  })

  const sendStatus = (status) =>
    send(ws, ['data.recurring_algo_orders_status.status', status])

  if (!validRequest) {
    d('invalid request: recurring_algo_order.status')
    return sendStatus('failed')
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  } else if (exID !== 'bitfinex') {
    sendStatus('failed')
    return sendError(
      ws,
      'Recurring algo orders currently only enabled for Bitfinex',
      ['recurringAlgoOrdersCurrentlyOnlyEnabledFor', { target: 'Bitfinex' }]
    )
  }

  const rest = new RESTv2({
    transform: true,
    url: restURL,
    apiKey: apiKey,
    apiSecret: apiSecret
  })

  try {
    const algoOrders = await rest.getRecurringAlgoOrdersStatus(payload)
    send(ws, ['data.recurring_algo_order_status', 'bitfinex', mode, algoOrders])
  } catch (e) {
    sendStatus('failed')
    return sendError(ws, e.message, e.i18n)
  }
}

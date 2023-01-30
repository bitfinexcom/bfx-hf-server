'use strict'

const { RESTv2 } = require('bfx-api-node-rest')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const send = require('../../../util/ws/send')

module.exports = async (server, ws, msg) => {
  const { restURL } = server
  const [, authToken, exID, algoOrderId] = msg
  const { apiKey, apiSecret } = ws.getCredentials()
  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    authToken: { type: 'string', v: authToken },
    algoOrderId: { type: 'string', v: algoOrderId }
  })

  const sendStatus = (status) => send(ws, ['data.recurring_algo_order.cancel_status', status])

  if (!validRequest) {
    sendStatus('failed')
    return
  }

  if (!isAuthorized(ws, authToken)) {
    sendStatus('failed')
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  } else if (exID !== 'bitfinex') {
    sendStatus('failed')
    return sendError(ws, 'Recurring algo orders currently only enabled for Bitfinex', ['recurringAlgoOrdersCurrentlyOnlyEnabledFor', { target: 'Bitfinex' }])
  }

  const rest = new RESTv2({
    transform: true,
    url: restURL,
    apiKey: apiKey,
    apiSecret: apiSecret
  })

  try {
    await rest.cancelRecurringAlgoOrder(algoOrderId)
    sendStatus('success')
  } catch (e) {
    sendStatus('failed')
    return sendError(ws, e.message, e.i18n)
  }
}

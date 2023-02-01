'use strict'

const { RESTv2 } = require('bfx-api-node-rest')
const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const { d, restURL } = server
  const [, authToken, algoOrderId] = msg
  const { apiKey, apiSecret } = ws.getCredentials()
  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    algoOrderId: { type: 'string', v: algoOrderId }
  })

  if (!validRequest) {
    return send(ws, ['data.recurring_algo_order.load_status', 'Invalid request'])
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  }

  const rest = new RESTv2({
    transform: true,
    url: restURL,
    apiKey: apiKey,
    apiSecret: apiSecret
  })

  try {
    const recurringAlgoOrder = await rest.getRecurringAlgoOrder(algoOrderId)
    send(ws, ['recurring_ao.loaded', algoOrderId])
    send(ws, ['data.recurring_ao', recurringAlgoOrder])
  } catch (e) {
    d('error loading recurring AO %s: %s', algoOrderId, e.stack)
    return sendError(ws, e.message, e.i18n)
  }
}

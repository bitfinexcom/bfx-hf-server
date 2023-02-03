'use strict'

const { RESTv2 } = require('bfx-api-node-rest')
const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const { Recurring } = require('bfx-hf-algo')

module.exports = async (server, ws, msg) => {
  const { d, restURL } = server
  const { mode } = ws
  const [, authToken, algoOrderId, gid] = msg
  const { apiKey, apiSecret } = ws.getCredentials()
  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    algoOrderId: { type: 'string', v: algoOrderId },
    gid: { type: 'number', v: gid }
  })

  if (!validRequest) {
    d('invalid request: algo:load')
    return
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
    const data = {
      ...recurringAlgoOrder,
      id: Recurring.id,
      gid,
      name: recurringAlgoOrder.alias,
      createdAt: new Date(recurringAlgoOrder.createdAt).getTime(),
      lastActive: new Date().getTime()
    }
    send(ws, ['algo.order_loaded', gid])
    send(ws, ['data.ao', 'bitfinex', mode, data])
  } catch (e) {
    d('error loading recurring AO %s: %s', algoOrderId, e.stack)
    sendError(ws, e.message, e.i18n)
  }
}

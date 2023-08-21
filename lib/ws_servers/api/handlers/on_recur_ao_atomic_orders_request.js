const { RESTv2 } = require('bfx-api-node-rest')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const send = require('../../../util/ws/send')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const { mode } = ws
  const { d, restURL } = server
  const [, authToken, exID, payload] = msg
  const { apiKey, apiSecret } = ws.getCredentials()

  const sendStatus = (status) => send(ws, ['data.recur_ao_atomic_orders.status', status])

  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    payload: { type: 'object', v: payload }
  })

  if (!validRequest) {
    d('invalid request: recur_ao_atomic_orders.status')
    return sendStatus('failed')
  }

  if (!isAuthorized(ws, authToken)) {
    sendStatus('failed')
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  } else if (exID !== 'bitfinex') {
    sendStatus('failed')
    return sendError(ws, 'Algo orders currently only enabled for Bitfinex', ['algoOrdersCurrentlyOnlyEnabledFor', { target: 'Bitfinex' }])
  }

  const rest = new RESTv2({
    transform: true,
    url: restURL,
    apiKey: apiKey,
    apiSecret: apiSecret
  })

  try {
    const orders = await rest.getRecurringAoOrders(payload)
    send(ws, ['data.recur_ao_atomic_orders', 'bitfinex', mode, orders])
  } catch (e) {
    sendStatus('failed')
    sendError(ws, e.message, e.i18n)
  }
}

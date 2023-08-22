const { Recurring } = require('bfx-hf-algo')
const { RESTv2 } = require('bfx-api-node-rest')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const send = require('../../../util/ws/send')
const isAuthorized = require('../../../util/ws/is_authorized')
const restPaginationHandler = require('../../../util/rest_pagination_handler')

module.exports = async (server, ws, msg) => {
  const { mode } = ws
  const { d, restURL, algoDB } = server
  const { AlgoOrder } = algoDB
  const [, authToken, exID, gid] = msg
  const { apiKey, apiSecret } = ws.getCredentials()

  const sendStatus = (status) =>
    send(ws, ['data.recur_ao_atomic_orders.status', status])

  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    gid: { type: 'string', v: gid }
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
    return sendError(ws, 'Algo orders currently only enabled for Bitfinex', [
      'algoOrdersCurrentlyOnlyEnabledFor',
      { target: 'Bitfinex' }
    ])
  }

  const rest = new RESTv2({
    transform: true,
    url: restURL,
    apiKey: apiKey,
    apiSecret: apiSecret
  })

  try {
    const { recurringAlgoOrderId } = await AlgoOrder.get({
      gid,
      algoID: Recurring.id
    })
    const orders = await restPaginationHandler(rest.getRecurringAoOrders, {
      algoOrderId: recurringAlgoOrderId
    })
    send(ws, ['data.recur_ao_atomic_orders', 'bitfinex', mode, orders])
  } catch (e) {
    sendStatus('failed')
    sendError(ws, e.message, e.i18n)
  }
}

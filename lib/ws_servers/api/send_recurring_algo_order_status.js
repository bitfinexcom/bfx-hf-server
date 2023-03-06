'use strict'

const { RESTv2 } = require('bfx-api-node-rest')
const sendError = require('../../util/ws/send_error')
const validateParams = require('../../util/ws/validate_params')
const send = require('../../util/ws/send')
const { orderHasValidPair } = require('./paper_filters')

const sendOrderHistory = (ws, algoOrders, isPaper) => {
  const orders = algoOrders
    .flatMap(({ orders = [] }) => orders)
    .filter(order => orderHasValidPair(isPaper, order))
    .map(order => ({
      ...order,
      meta: { ...order.meta, lastActive: order.mtsUpdate }
    }))

  send(ws, ['data.order_history', orders])
}

const sendErrorMessages = (ws, algoOrders, isPaper) => {
  algoOrders = algoOrders.filter((algoOrder) => {
    return orderHasValidPair(isPaper, { symbol: algoOrder.symbol })
  })

  const messages = algoOrders.flatMap(({ errorMessages = [] }) => {
    return errorMessages.map(({ message }) => message)
  })

  if (messages.length) {
    messages.forEach((message) => {
      sendError(ws, message)
    })
  }
}

module.exports = async (server, ws, payload) => {
  const { mode } = ws
  const { d, restURL } = server
  const { apiKey, apiSecret } = ws.getCredentials()

  const isPaper = mode === 'paper'

  const validRequest = validateParams(ws, {
    payload: { type: 'object', v: payload }
  })

  const sendStatus = (status) =>
    send(ws, ['data.recurring_algo_orders_status.status', status])

  if (!validRequest) {
    d('invalid request: recurring_algo_order.status')
    return sendStatus('failed')
  }

  const rest = new RESTv2({
    transform: true,
    url: restURL,
    apiKey: apiKey,
    apiSecret: apiSecret
  })

  try {
    const algoOrders = await rest.getRecurringAlgoOrdersStatus(payload)

    sendOrderHistory(ws, algoOrders, isPaper)
    sendErrorMessages(ws, algoOrders, isPaper)
  } catch (e) {
    sendStatus('failed')
    return sendError(ws, e.message, e.i18n)
  }
}

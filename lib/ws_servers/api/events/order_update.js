'use strict'

const _isFunction = require('lodash/isFunction')
const { receiveOrder } = require('../../../util/ws/adapters')
const { orderHasValidPair, orderHasValidScope } = require('../paper_filters')
const { notifyOrderModified, notifyOrderPartiallyFilled } = require('../../../util/ws/notify')
const send = require('../../../util/ws/send')
const transformOrder = require('../../../exchange_clients/bitfinex/transformers/order')

module.exports = (ws, isPaper, dmsScope, data, sendDataToMetricsServer) => {
  const transformedOrder = transformOrder(data)
  const order = receiveOrder(transformedOrder)

  if (!orderHasValidPair(isPaper, order) || !orderHasValidScope(order, dmsScope)) {
    return
  }

  if (_isFunction(sendDataToMetricsServer)) {
    sendDataToMetricsServer(['save_order', data])
  }

  if (order.amount === order.originalAmount) {
    notifyOrderModified(ws, 'bitfinex', order)
  } else if (order.status.startsWith('PARTIALLY')) {
    notifyOrderPartiallyFilled(ws, 'bitfinex', order)
  }

  return send(ws, ['data.order', 'bitfinex', transformedOrder])
}

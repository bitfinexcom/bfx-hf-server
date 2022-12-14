'use strict'

const _isFunction = require('lodash/isFunction')
const { orderHasValidPair, orderHasValidScope } = require('../paper_filters')
const { notifyOrderSubmitted } = require('../../../util/ws/notify')
const send = require('../../../util/ws/send')
const { transformOrder } = require('../../../exchange_clients/bitfinex/transformers/order')

module.exports = (ws, isPaper, dmsScope, data, sendDataToMetricsServer, session) => {
  const order = transformOrder(data)

  if (!orderHasValidPair(isPaper, order) || !orderHasValidScope(order, dmsScope)) {
    return
  }

  if (_isFunction(sendDataToMetricsServer)) {
    sendDataToMetricsServer(['save_order', data])
  }

  notifyOrderSubmitted(ws, 'bitfinex', order)

  session.getAlgoWorker().updateLastActive(order.gid, order.updated)

  return send(ws, ['data.order', 'bitfinex', order])
}

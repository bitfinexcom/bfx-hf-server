const { receiveOrder } = require('../../../util/ws/adapters')
const { orderHasValidPair, orderHasValidScope } = require('../paper_filters')
const { notifyOrderCancelled, notifyOrderExecuted } = require('../../../util/ws/notify')
const send = require('../../../util/ws/send')

module.exports = (ws, isPaper, scope, data) => {
  const order = receiveOrder(data)
  if (!orderHasValidPair(isPaper, order) || !orderHasValidScope(order, scope)) {
    return
  }

  if (order.status.includes('CANCELED')) {
    notifyOrderCancelled(ws, 'bitfinex', order)
  } else if (order.status.includes('EXECUTED')) {
    notifyOrderExecuted(ws, 'bitfinex', order)
  }

  return send(ws, ['data.order.close', 'bitfinex', data])
}

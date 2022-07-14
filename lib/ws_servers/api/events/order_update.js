const { receiveOrder } = require('../../../util/ws/adapters')
const { orderHasValidPair, orderHasValidScope } = require('../paper_filters')
const { notifyOrderModified, notifyOrderPartiallyFilled } = require('../../../util/ws/notify')
const send = require('../../../util/ws/send')

module.exports = (ws, isPaper, dmsScope, data) => {
  const order = receiveOrder(data)

  if (!orderHasValidPair(isPaper, order) || !orderHasValidScope(order, dmsScope)) {
    return
  }

  if (order.amount === order.originalAmount) {
    notifyOrderModified(ws, 'bitfinex', order)
  } else if (order.status.startsWith('PARTIALLY')) {
    notifyOrderPartiallyFilled(ws, 'bitfinex', order)
  }

  return send(ws, ['data.order', 'bitfinex', data])
}

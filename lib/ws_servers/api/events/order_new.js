const { receiveOrder } = require('../../../util/ws/adapters')
const { orderHasValidPair, orderHasValidScope } = require('../paper_filters')
const { notifyOrderSubmitted } = require('../../../util/ws/notify')
const send = require('../../../util/ws/send')
const transformOrder = require('../../../exchange_clients/bitfinex/transformers/order')

module.exports = (ws, isPaper, dmsScope, data) => {
  const transformedOrder = transformOrder(data)
  const order = receiveOrder(transformedOrder)

  if (!orderHasValidPair(isPaper, order) || !orderHasValidScope(order, dmsScope)) {
    return
  }

  // TODO: send order to metrics client

  notifyOrderSubmitted(ws, 'bitfinex', order)
  return send(ws, ['data.order', 'bitfinex', transformedOrder])
}

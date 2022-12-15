const onOrdersSnapshot = require('../events/orders_snapshot')
const sendError = require('../../../util/ws/send_error')
const { fillWithFlags } = require('../../../exchange_clients/bitfinex/transformers/order')

/**
 * @param {Session} session
 * @param {FilteredWebSocket} ws
 * @param {RESTv2} rest
 */
module.exports = async (session, ws, rest) => {
  const { isPaper, dmsScope } = session

  try {
    const orders = await rest.activeOrders()
    const formatted = orders.map((order) => fillWithFlags(order))

    return onOrdersSnapshot(ws, isPaper, dmsScope, formatted)
  } catch (err) {
    sendError(ws, err.message)
  }
}

const { orderHasValidPair, orderHasValidScope } = require('../paper_filters')
const send = require('../../../util/ws/send')

module.exports = (ws, isPaper, dmsScope, orders) => {
  const filteredOrders = orders
    .filter((order) => {
      return orderHasValidPair(isPaper, order) && orderHasValidScope(order, dmsScope)
    })
  return send(ws, ['data.orders', 'bitfinex', filteredOrders])
}

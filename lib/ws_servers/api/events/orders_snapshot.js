const { receiveOrder } = require('../../../util/ws/adapters')
const { orderHasValidPair, orderHasValidScope } = require('../paper_filters')
const send = require('../../../util/ws/send')

module.exports = (ws, isPaper, scope, data) => {
  const filteredData = data.filter((item) => {
    const order = receiveOrder(item)
    return orderHasValidPair(isPaper, order) && orderHasValidScope(order, scope)
  })
  return send(ws, ['data.orders', 'bitfinex', filteredData])
}

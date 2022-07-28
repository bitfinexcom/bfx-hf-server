const onOrdersSnapshot = require('../events/orders_snapshot')
const sendError = require('../../../util/ws/send_error')

const fieldsToPositions = Object.entries({
  id: 0,
  gid: 1,
  cid: 2,
  symbol: 3,
  mtsCreate: 4,
  mtsUpdate: 4,
  amount: 5,
  amountOrig: 6,
  type: 7,
  typePrev: 8,
  mtsTIF: 9,
  flags: 10,
  status: 11,
  price: 12,
  priceAvg: 13,
  priceTrailing: 14,
  priceAuxLimit: 15,
  notify: 16,
  hidden: 17,
  placedId: 18,
  routing: 19,
  meta: 20
})

const serializeOrders = (order) => {
  const serialized = new Array(fieldsToPositions.length)

  for (const [field, pos] of fieldsToPositions) {
    const value = order[field]
    if (!serialized[pos]) {
      serialized[pos] = value
    }
  }

  return serialized
}

/**
 * @param {Session} session
 * @param {FilteredWebSocket} ws
 * @param {RESTv2} rest
 */
module.exports = async (session, ws, rest) => {
  const { isPaper, dmsScope } = session

  try {
    const orders = await rest.activeOrders()
    const formatted = orders.map(serializeOrders)

    return onOrdersSnapshot(ws, isPaper, dmsScope, formatted)
  } catch (err) {
    sendError(ws, err.message)
  }
}

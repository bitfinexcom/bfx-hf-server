const onOrdersSnapshot = require('./events/orders_snapshot')
const onPositionsSnapshot = require('./events/positions_snapshot')
const onWalletsSnapshot = require('./events/wallets_snapshot')

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
 * @param {Session} ws
 * @param {RESTv2} rest
 */
const sendWallets = async (ws, rest) => {
  const { isPaper } = ws
  const wallets = await rest.wallets()
  const formatted = wallets.map(({ currency, type, balance, balanceAvailable }) => {
    return [currency, type, balance, balanceAvailable]
  })

  return onWalletsSnapshot(ws, isPaper, formatted)
}

/**
 * @param {Session} ws
 * @param {RESTv2} rest
 */
const sendOrders = async (ws, rest) => {
  const { isPaper, dmsScope } = ws
  const orders = await rest.orderHistory()
  const formatted = orders.map(serializeOrders)
  return onOrdersSnapshot(ws, isPaper, dmsScope, formatted)
}

/**
 * @param {Session} ws
 * @param {RESTv2} rest
 */
const sendPositions = async (ws, rest) => {
  const { isPaper } = ws
  const positions = await rest.positionsHistory()
  const formatted = positions.map(pos => pos.serialize())
  return onPositionsSnapshot(ws, isPaper, formatted)
}

/**
 * @param {Session} ws
 * @return {Promise}
 */
module.exports = async (ws) => {
  const { rest } = ws.getClient()
  return Promise.all([
    sendWallets(ws, rest),
    sendPositions(ws, rest),
    sendOrders(ws, rest)
  ])
}

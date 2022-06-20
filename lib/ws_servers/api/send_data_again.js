const onOrdersSnapshot = require('./events/orders_snapshot')
const onPositionsSnapshot = require('./events/positions_snapshot')
const onWalletsSnapshot = require('./events/wallets_snapshot')

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
  return onOrdersSnapshot(ws, isPaper, dmsScope, orders)
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

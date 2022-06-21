const sendWallets = require('./send_wallets')
const sendPositions = require('./send_positions')
const sendOrders = require('./send_orders')

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

const sendWallets = require('./send_wallets')
const sendPositions = require('./send_positions')
const sendOrders = require('./send_orders')

/**
 * @param {Session} session
 * @param {FilteredWebSocket} ws
 * @return {Promise}
 */
module.exports = async (session, ws) => {
  const { rest } = session.getClient()

  return Promise.all([
    sendWallets(session, ws, rest),
    sendPositions(session, ws, rest),
    sendOrders(session, ws, rest)
  ])
}

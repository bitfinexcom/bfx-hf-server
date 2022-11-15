const sendWallets = require('./send_wallets')
const sendPositions = require('./send_positions')
const sendOrders = require('./send_orders')
const sendUserInfo = require('./send_user_info')

/**
 * @param {Session} session
 * @param {FilteredWebSocket} ws
 * @return {Promise}
 */
module.exports = async (session, ws) => {
  const { rest } = session.getClient()

  await sendUserInfo(session, ws, rest)
  await sendWallets(session, ws, rest)
  await sendPositions(session, ws, rest)
  await sendOrders(session, ws, rest)
}

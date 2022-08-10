const onWalletsSnapshot = require('../events/wallets_snapshot')
const sendError = require('../../../util/ws/send_error')

const serializeWallet = (wallet) => {
  const { currency, type, balance, balanceAvailable } = wallet
  return [currency, type, balance, balanceAvailable]
}

/**
 * @param {Session} session
 * @param {FilteredWebSocket} ws
 * @param {RESTv2} rest
 */
module.exports = async (session, ws, rest) => {
  const { isPaper } = session

  try {
    const wallets = await rest.wallets()
    const formatted = wallets.map(serializeWallet)

    return onWalletsSnapshot(ws, isPaper, formatted)
  } catch (err) {
    sendError(ws, err.message)
  }
}

const onWalletsSnapshot = require('../events/wallets_snapshot')

const serializeWallet = (wallet) => {
  const { currency, type, balance, balanceAvailable } = wallet
  return [currency, type, balance, balanceAvailable]
}

/**
 * @param {Session} ws
 * @param {RESTv2} rest
 */
module.exports = async (ws, rest) => {
  const { isPaper } = ws

  const wallets = await rest.wallets()
  const formatted = wallets.map(serializeWallet)

  return onWalletsSnapshot(ws, isPaper, formatted)
}

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const { db } = server
  const { FavouriteTradePairs } = db
  const [, authToken] = msg

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const { favouriteTradePairs = {} } = await FavouriteTradePairs.getAll()
  const { pairs = [] } = favouriteTradePairs

  send(ws, ['data.favourite_trade_pairs.saved', pairs])
}

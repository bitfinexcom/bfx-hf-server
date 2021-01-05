'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const { db } = server
  const { FavouriteTradingPairs } = db
  const [, authToken] = msg

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const { favouriteTradingPairs = {} } = await FavouriteTradingPairs.getAll()
  const { pairs = [] } = favouriteTradingPairs

  send(ws, ['data.favourite_trading_pairs.saved', pairs])
}

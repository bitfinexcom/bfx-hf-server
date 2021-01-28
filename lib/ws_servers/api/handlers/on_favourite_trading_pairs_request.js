'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const { db, d } = server
  const { FavouriteTradingPairs } = db
  const [, authToken, mode] = msg

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  if (!['paper', 'main'].includes(mode)) {
    d('error: on_favourite_trading_pairs_request must contain paper or main')
    return
  }

  const data = await FavouriteTradingPairs.get(mode)

  let res = []
  if (data && data.pairs) {
    res = data.pairs
  }

  send(ws, ['data.favourite_trading_pairs.saved', res])
}

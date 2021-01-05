'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const {
  notifySuccess
} = require('../../../util/ws/notify')

module.exports = async (server, ws, msg) => {
  const { d, db } = server
  const { FavouriteTradingPairs } = db
  const [, authToken, pairs] = msg

  const validRequest = validateParams(ws, {
    pairs: { type: 'array', v: pairs }
  })

  if (!validRequest) {
    d(`error: Invalid request params while saving favourite trading pairs`)
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const favouriteTradingPairs = {
    pairs
  }

  await FavouriteTradingPairs.set(favouriteTradingPairs)

  d('Favourite trading pairs has been saved')

  notifySuccess(ws, 'Favourite trading pairs successfully saved')

  send(ws, ['data.favourite_trading_pairs.saved', pairs])
}

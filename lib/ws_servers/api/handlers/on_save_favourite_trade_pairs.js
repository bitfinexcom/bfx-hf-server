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
  const { FavouriteTradePairs } = db
  const [, authToken, pairs] = msg

  const validRequest = validateParams(ws, {
    pairs: { type: 'array', v: pairs }
  })

  if (!validRequest) {
    d(`error: Invalid request params for favourite trade pairs`)
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const favouriteTradePairs = {
    pairs
  }

  await FavouriteTradePairs.set(favouriteTradePairs)

  d('Favourite trade pairs has been saved')

  notifySuccess(ws, 'Favourite trade pairs successfully saved')

  send(ws, ['data.favourite_trade_pairs.saved', pairs])
}

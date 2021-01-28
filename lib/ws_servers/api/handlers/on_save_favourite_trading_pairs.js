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
  const [, authToken, pairs, mode] = msg

  const validRequest = validateParams(ws, {
    pairs: { type: 'array', v: pairs },
    mode: { type: 'string', v: mode }
  })

  if (!validRequest) {
    d('error: Invalid request params while saving favourite trading pairs')
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  if (!['paper', 'main'].includes(mode)) {
    d('error: on_favourite_trading_pairs_request must contain paper or main')
    return
  }

  const data = { pairs }
  if (mode === 'main') {
    data.main = 'main'
  }

  if (mode === 'paper') {
    data.paper = 'paper'
  }

  await FavouriteTradingPairs.set(data)

  d(`Favourite trading pairs have been saved (${mode})`)

  notifySuccess(ws, 'Favourite trading pairs successfully saved')
  send(ws, ['data.favourite_trading_pairs.saved', pairs])
}

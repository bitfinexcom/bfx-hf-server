'use strict'

const _capitalize = require('lodash/capitalize')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')

const cancelOrderBitfinex = require('../cancel_order_bitfinex')
const cancelOrderBinance = require('../cancel_order_binance')

module.exports = async (server, ws, msg) => {
  const { d } = server
  const [, authToken, exID, symbol, id] = msg
  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    authToken: { type: 'string', v: authToken },
    symbol: { type: 'string', v: symbol },
    id: { type: 'number', v: id }
  })

  if (!validRequest) {
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  } else if (exID !== 'bitfinex' && exID !== 'binance') {
    return sendError(ws, 'Unrecognised exchange, cannot submit order')
  } else if (!ws.clients[exID]) {
    return sendError(ws, `No client open for ${_capitalize(exID)}`)
  }

  switch (exID) {
    case 'bitfinex': {
      await cancelOrderBitfinex(d, ws, ws.clients.bitfinex, symbol, id)
      break
    }

    case 'binance': {
      await cancelOrderBinance(d, ws, ws.clients.binance, symbol, id)
      break
    }

    default: {
      d('unknown exID broke through: %s', exID)
    }
  }
}

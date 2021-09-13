'use strict'

const {
  notifyInfo,
  notifyErrorBitfinex
} = require('../../util/ws/notify')

module.exports = async (d, ws, bfxClient, symbol, id) => {
  notifyInfo(ws, 'Cancelling order on Bitfinex', ['cancellingOrderOn', { target: 'Bitfinex' }])

  try {
    await bfxClient.cancelOrder(id)

    d('sucessfully cancelled order [bitfinex]')
  } catch (error) {
    d('failed to cancel order [bitfinex]')
    notifyErrorBitfinex(ws, error)
  }
}

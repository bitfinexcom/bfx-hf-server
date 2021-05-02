'use strict'

const {
  notifyInfo,
  notifyErrorBitfinex
} = require('../../util/ws/notify')

module.exports = async (d, ws, bfxClient, orderPacket) => {
  notifyInfo(ws, 'Submitting order to Bitfinex')

  try {
    await bfxClient.submitOrder(orderPacket)

    d('sucessfully submitted order')
  } catch (error) {
    const txt = error.message ? error.message : error

    d('failed to submit order', txt)
    notifyErrorBitfinex(ws, error)
  }
}

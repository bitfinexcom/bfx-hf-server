'use strict'

const sendOrders = require('./send_orders')
const sendBalances = require('./send_balances')
const {
  notifyInfo,
  notifyErrorBinance
} = require('../../util/ws/notify')

module.exports = async (d, ws, binanceClient, orderPacket) => {
  notifyInfo(ws, 'Submitting order to Binance')

  try {
    await binanceClient.submitOrder(orderPacket)

    d('sucessfully submitted order [binance]')
  } catch (error) {
    d('failed to submit order [binance]')
    notifyErrorBinance(ws, error)
    return
  }

  try {
    await sendBalances(ws, 'binance', binanceClient)
  } catch (error) {
    d(`failed to send balances [binance]: ${error.message}`)
    notifyErrorBinance(ws, error)
  }

  try {
    await sendOrders(ws, 'binance', binanceClient)
  } catch (error) {
    d(`failed to send orders [binance]: ${error.message}`)
    notifyErrorBinance(ws, error)
  }
}

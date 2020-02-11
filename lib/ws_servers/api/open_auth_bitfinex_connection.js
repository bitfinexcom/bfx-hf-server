'use strict'

const { _default: DEFAULT_SETTINGS } = require('bfx-hf-ui-config').UserSettings
const BitfinexExchangeConnection = require('../../exchange_clients/bitfinex')
const { notifyInfo, notifyError, notifySuccess } = require('../../util/ws/notify')
const send = require('../../util/ws/send')

module.exports = async (ws, apiKey, apiSecret, db, d) => {
  notifyInfo(ws, 'Connecting to Bitfinex...')

  const { UserSettings } = db
  const { userSettings: settings } = await UserSettings.getAll()
  const client = new BitfinexExchangeConnection()
  const { dms } = settings || DEFAULT_SETTINGS

  d('opening auth bfx connection (dms %s)', dms ? 'enabled' : 'disabled')

  client.openWS({
    apiKey,
    apiSecret,
    dms: dms ? 4 : 0,
  })

  client.on('error', (err) => {
    notifyError(ws, `Bitfinex - ${err.message}`)
  })

  client.on('open', () => {
    notifyInfo(ws, 'Connected to Bitfinex')
  })

  client.on('auth', () => {
    notifySuccess(ws, 'Authenticated with Bitfinex')
    send(ws, ['data.client', 'bitfinex', 2]) // TODO: Extract client state into enum
  })

  client.on('close', () => {
    notifyInfo(ws, 'Disconnected from Bitfinex')
    send(ws, ['data.client', 'bitfinex', 0])
  })

  client.onData((chanID, payload) => {
    if (chanID !== 0) return

    const [, msgType, msgData] = payload

    switch (msgType) {
      case 'ws': {
        send(ws, ['data.balances', 'bitfinex', BitfinexExchangeConnection.transformBalances(msgData)])
        break
      }

      case 'wu': {
        send(ws, ['data.balance', 'bitfinex', BitfinexExchangeConnection.transformBalance(msgData)])
        break
      }

      case 'ps': {
        send(ws, ['data.positions', 'bitfinex', msgData])
        break
      }

      case 'pu': {
        send(ws, ['data.position', 'bitfinex', msgData])
        break
      }

      case 'pc': {
        send(ws, ['data.position.close', 'bitfinex', msgData])
        break
      }

      case 'os': {
        send(ws, ['data.orders', 'bitfinex', BitfinexExchangeConnection.transformOrders(msgData)])
        break
      }

      case 'on':
      case 'ou': {
        send(ws, ['data.order', 'bitfinex', BitfinexExchangeConnection.transformOrder(msgData)])
        break
      }

      case 'oc': {
        send(ws, ['data.order.close', 'bitfinex', BitfinexExchangeConnection.transformOrder(msgData)])
        break
      }

      case 'n': {
        const [,,,,,, status, text] = msgData

        if (status === 'SUCCESS') {
          notifySuccess(ws, text)
        } else if (status === 'INFO') {
          notifyInfo(ws, text)
        } else if (status === 'ERROR') {
          notifyError(ws, text)
        }

        break
      }
    }
  })

  send(ws, ['data.client', 'bitfinex', 1])

  client.openSocket()

  return client
}

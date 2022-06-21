'use strict'

const BitfinexExchangeConnection = require('../../exchange_clients/bitfinex')
const {
  notifyInfo,
  notifyError,
  notifySuccess
} = require('../../util/ws/notify')
const send = require('../../util/ws/send')
const {
  WS_CONNECTION,
  DMS_ENABLED
} = require('../../constants')
const onNotify = require('./events/notify')
const onOrderClose = require('./events/order_close')
const onOrderNew = require('./events/order_new')
const onOrderUpdate = require('./events/order_update')
const onOrdersSnapshot = require('./events/orders_snapshot')
const onPositionClose = require('./events/position_close')
const onPositionUpdate = require('./events/position_update')
const onPositionsSnapshot = require('./events/positions_snapshot')
const onWalletUpdate = require('./events/wallet_update')
const onWalletsSnapshot = require('./events/wallets_snapshot')

module.exports = ({ ws, apiKey, apiSecret, authToken, dms, d, wsURL, restURL, isPaper, dmsScope = 'app' }) => {
  notifyInfo(ws, 'Connecting to Bitfinex...', ['connectingTo', { target: 'Bitfinex' }])

  const client = new BitfinexExchangeConnection({ wsURL, restURL })

  d('opening auth bfx connection (dms %s)', dms ? 'enabled' : 'disabled')

  client.setAuthArgs({
    dms: dms ? DMS_ENABLED : 0,
    apiKey,
    apiSecret,
    authToken
  })
  client.openWS({
    apiKey,
    apiSecret,
    authToken,
    channelFilters: [
      'trading',
      'wallet',
      'notify'
    ]
  })

  client.on('ws2:error', (err) => {
    notifyError(ws, `Bitfinex - ${err.message}`)
  })

  client.on('ws2:open', () => {
    notifyInfo(ws, 'Connected to Bitfinex', ['connectedTo', { target: 'Bitfinex' }])
  })

  client.on('ws2:event:auth:success', () => {
    notifySuccess(ws, 'Authenticated with Bitfinex', ['authenticatedWith', { target: 'Bitfinex' }])
    send(ws, ['data.client', 'bitfinex', WS_CONNECTION.OPENED])
  })

  client.on('ws2:close', () => {
    notifyInfo(ws, 'Disconnected from Bitfinex', ['disconnectedFrom', { target: 'Bitfinex' }])
    send(ws, ['data.client', 'bitfinex', WS_CONNECTION.CLOSED])
  })

  client.onData(payload => {
    const [msgType, msgData] = payload

    if (msgType[1] === 's') {
      console.log('@', msgType, msgData)
    }

    switch (msgType) {
      case 'ws': {
        return onWalletsSnapshot(ws, isPaper, msgData)
      }
      case 'wu': {
        return onWalletUpdate(ws, isPaper, msgData)
      }
      case 'ps': {
        return onPositionsSnapshot(ws, isPaper, msgData)
      }
      case 'pu': {
        return onPositionUpdate(ws, isPaper, msgData)
      }
      case 'pc': {
        return onPositionClose(ws, isPaper, msgData)
      }
      case 'os': {
        return onOrdersSnapshot(ws, isPaper, dmsScope, msgData)
      }
      case 'on': {
        return onOrderNew(ws, isPaper, dmsScope, msgData)
      }
      case 'ou': {
        return onOrderUpdate(ws, isPaper, dmsScope, msgData)
      }
      case 'oc': {
        return onOrderClose(ws, isPaper, dmsScope, msgData)
      }
      case 'n': {
        return onNotify(ws, msgData)
      }
    }
  })

  send(ws, ['data.client', 'bitfinex', WS_CONNECTION.CONNECTING])

  client.openSocket()

  return client
}

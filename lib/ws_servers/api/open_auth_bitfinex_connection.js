'use strict'

const BitfinexExchangeConnection = require('../../exchange_clients/bitfinex')
const {
  notifyInfo,
  notifyError,
  notifySuccess
} = require('../../util/ws/notify')
const send = require('../../util/ws/send')
const { WS_CONNECTION, DMS_ENABLED } = require('../../constants')
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
const isAddrInfoError = require('../../util/is_addr_info_error')
const sendRecurringAlgoOrderList = require('./send_recurring_algo_order_list')

module.exports = ({
  ws,
  apiKey,
  apiSecret,
  authToken,
  dms,
  d,
  wsURL,
  restURL,
  isPaper,
  dmsScope = 'app',
  sendDataToMetricsServer,
  mode,
  session,
  algoDB
}) => {
  notifyInfo(ws, 'Connecting to Bitfinex...', [
    'connectingTo',
    { target: 'Bitfinex' }
  ])

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
    channelFilters: ['trading', 'wallet', 'notify']
  })

  client.on('ws2:error', (err) => {
    if (isAddrInfoError(err.message)) return
    notifyError(ws, `Bitfinex - ${err.message}`)
  })

  client.on('ws2:open', () => {
    notifyInfo(ws, 'Connected to Bitfinex', [
      'connectedTo',
      { target: 'Bitfinex' }
    ])
  })

  client.on('ws2:event:auth:success', async () => {
    notifySuccess(ws, 'Authenticated with Bitfinex', [
      'authenticatedWith',
      { target: 'Bitfinex' }
    ])
    send(ws, ['data.client', 'bitfinex', mode, WS_CONNECTION.OPENED])
    const userInfo = await client.getUserInfo()
    if (userInfo) {
      send(ws, [
        'info.username',
        isPaper ? 'paper' : 'main',
        userInfo.username
      ])
    }
    await sendRecurringAlgoOrderList(
      {
        d,
        restURL,
        algoDB
      },
      ws,
      {
        apiKey,
        apiSecret
      },
      mode
    )
  })

  client.on('ws2:close', () => {
    notifyInfo(ws, 'Disconnected from Bitfinex', [
      'disconnectedFrom',
      { target: 'Bitfinex' }
    ])
    send(ws, ['data.client', 'bitfinex', mode, WS_CONNECTION.CLOSED])
  })

  client.onData((payload) => {
    const [msgType, msgData] = payload

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
        return onOrderNew(
          ws,
          isPaper,
          dmsScope,
          msgData,
          sendDataToMetricsServer,
          session
        )
      }
      case 'ou': {
        return onOrderUpdate(
          ws,
          isPaper,
          dmsScope,
          msgData,
          sendDataToMetricsServer,
          session
        )
      }
      case 'oc': {
        return onOrderClose(
          ws,
          isPaper,
          dmsScope,
          msgData,
          sendDataToMetricsServer,
          session
        )
      }
      case 'n': {
        return onNotify(ws, msgData)
      }
    }
  })

  send(ws, ['data.client', 'bitfinex', mode, WS_CONNECTION.CONNECTING])

  client.openSocket()

  return client
}

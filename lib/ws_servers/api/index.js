'use strict'

const PI = require('p-iteration')

const { get: getCredentials } = require('../../db/credentials')
const EXCHANGE_ADAPTERS = require('../../exchange_clients')
const send = require('../../util/ws/send')
const HFDSClient = require('../../ws_clients/hf_ds')
const AlgoServerClient = require('../../ws_clients/algos')
const WSServer = require('../../ws_server')

const onAuthSubmit = require('./handlers/on_auth_submit')
const onAuthInit = require('./handlers/on_auth_init')
const onAuthReset = require('./handlers/on_auth_reset')
const onSubscribe = require('./handlers/on_subscribe')
const onUnsubscribe = require('./handlers/on_unsubscribe')
const onCandleRequest = require('./handlers/on_candle_request')
const onBacktestExecute = require('./handlers/on_backtest_execute')
const onBacktestServerSideExecute = require('./handlers/on_backtest_execute_serverside')

const onSaveStrategy = require('./handlers/on_save_strategy')
const onSaveAPICredentials = require('./handlers/on_save_api_credentials')
const onOrderSubmit = require('./handlers/on_order_submit')
const onOrderCancel = require('./handlers/on_order_cancel')
const onAlgoOrderSubmit = require('./handlers/on_algo_order_submit')
const onAlgoOrderCancel = require('./handlers/on_algo_order_cancel')
const onSettingsUpdate = require('./handlers/on_settings_update')
const onSettingsRequest = require('./send_settings')

const VERSION = 1

module.exports = class APIWSServer extends WSServer {
  constructor ({
    port,
    server,
    db,
    hfDSBitfinexURL,
    algoServerURL,
    restURL,
    wsURL
  }) {
    super({
      port,
      server,
      debugName: 'api',
      msgHandlers: {
        'auth.init': onAuthInit,
        'auth.submit': onAuthSubmit,
        'auth.reset': onAuthReset,

        subscribe: onSubscribe,
        unsubscribe: onUnsubscribe,

        'get.candles': onCandleRequest,
        'get.settings': onSettingsRequest,
        'exec.bt': onBacktestExecute,
        'exec.str': onBacktestServerSideExecute,

        'strategy.save': onSaveStrategy,
        'api_credentials.save': onSaveAPICredentials,
        'order.submit': onOrderSubmit,
        'order.cancel': onOrderCancel,
        'algo_order.submit': onAlgoOrderSubmit,
        'algo_order.cancel': onAlgoOrderCancel,
        'settings.update': onSettingsUpdate
      }
    })

    this.db = db
    this.algoServerURL = algoServerURL
    this.hfDSClients = {
      bitfinex: new HFDSClient({ id: 'bitfinex', url: hfDSBitfinexURL })
    }

    this.wsURL = wsURL
    this.restURL = restURL

    this.exchangeClient = new EXCHANGE_ADAPTERS[0]({})
    this.exchangeClient.openWS()
  }

  openAlgoServerClient () {
    return new AlgoServerClient({ url: this.algoServerURL })
  }

  async sendInitialConnectionData (ws) {
    send(ws, ['info.version', VERSION])
    send(ws, ['info.exchanges', EXCHANGE_ADAPTERS.map(({ id }) => id)])

    await PI.forEach(EXCHANGE_ADAPTERS, async ({ id }) => {
      const { Market } = this.db
      const markets = await Market.find([['exchange', '=', id]])

      send(ws, ['info.markets', id, markets])
    }).catch((err) => {
      this.d('error sending markets to client: %s', err.stack)
    })

    const credentials = await getCredentials(this.db)

    send(ws, ['info.auth_configured', !!credentials])
  }

  async onWSSConnection (ws) {
    super.onWSSConnection(ws)

    ws.clients = {}
    ws.user = null

    await this.sendInitialConnectionData(ws)

    this.exchangeClient.onData((chanID, data) => {
      send(ws, ['data', 'bitfinex', chanID, data])
    })
  }

  onWSClose (ws) {
    super.onWSClose(ws)

    Object.keys(ws.clients).forEach(exID => {
      if (ws.aoc) {
        ws.aoc.closeHost(exID)
      }

      ws.clients[exID].close()
    })

    if (ws.aoc) {
      ws.aoc.close()
    }

    const subExchanges = Object.keys(ws.subscriptions || {})

    subExchanges.forEach((exID) => {
      ws.subscriptions[exID].forEach((channelData) => {
        this.exchangeClient.unsubscribe(channelData)
      })
    })

    ws.clients = {}
    ws.user = null
  }
}

'use strict'

const { get: getCredentials } = require('../../db/credentials')
const EXCHANGE_ADAPTERS = require('../../exchange_clients')
const send = require('../../util/ws/send')
const HFDSClient = require('../../ws_clients/hf_ds')
const AlgoServerClient = require('../../ws_clients/algos')
const WSServer = require('../../ws_server')
const { CREDENTIALS_CID } = require('../../db/credentials')

const onAuthSubmit = require('./handlers/on_auth_submit')
const onAuthInit = require('./handlers/on_auth_init')
const onAuthReset = require('./handlers/on_auth_reset')
const onSubscribe = require('./handlers/on_subscribe')
const onUnsubscribe = require('./handlers/on_unsubscribe')
const onActiveAlgoOrdersRequest = require('./handlers/on_active_algo_orders_request')
const onBacktestExecute = require('./handlers/on_backtest_execute')
const onBacktestServerSideExecute = require('./handlers/on_backtest_execute_serverside')

const onSaveStrategy = require('./handlers/on_save_strategy')
const onRemoveStrategy = require('./handlers/on_remove_strategy')
const onSaveAPICredentials = require('./handlers/on_save_api_credentials')
const onAlgoOrderRemove = require('./handlers/on_algo_order_remove')
const onAlgoOrderLoad = require('./handlers/on_algo_order_load')
const onOrderSubmit = require('./handlers/on_order_submit')
const onOrderCancel = require('./handlers/on_order_cancel')
const onAlgoOrderSubmit = require('./handlers/on_algo_order_submit')
const onAlgoOrderCancel = require('./handlers/on_algo_order_cancel')
const onSettingsUpdate = require('./handlers/on_settings_update')
const onSettingsRequest = require('./send_settings')
const onSaveFavouriteTradingPairs = require('./handlers/on_save_favourite_trading_pairs')
const onFavouriteTradingPairsRequest = require('./handlers/on_favourite_trading_pairs_request')

const VERSION = 1

module.exports = class APIWSServer extends WSServer {
  constructor ({
    port,
    server,
    db,
    algoDB,
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

        'get.settings': onSettingsRequest,
        'get.active_algo_orders': onActiveAlgoOrdersRequest,
        'get.favourite_trading_pairs': onFavouriteTradingPairsRequest,
        'exec.bt': onBacktestExecute,
        'exec.str': onBacktestServerSideExecute,

        'strategy.save': onSaveStrategy,
        'strategy.remove': onRemoveStrategy,
        'api_credentials.save': onSaveAPICredentials,
        'order.submit': onOrderSubmit,
        'order.cancel': onOrderCancel,
        'algo_order.submit': onAlgoOrderSubmit,
        'algo_order.load': onAlgoOrderLoad,
        'algo_order.cancel': onAlgoOrderCancel,
        'algo_order.remove': onAlgoOrderRemove,
        'settings.update': onSettingsUpdate,
        'favourite_trading_pairs.save': onSaveFavouriteTradingPairs
      }
    })

    this.db = db
    this.algoDB = algoDB
    this.algoServerURL = algoServerURL
    this.hfDSClients = {
      bitfinex: new HFDSClient({ id: 'bitfinex', url: hfDSBitfinexURL })
    }

    this.wsURL = wsURL
    this.restURL = restURL

    this.exchangeClient = new EXCHANGE_ADAPTERS[0]({})
  }

  openAlgoServerClient () {
    return new AlgoServerClient({ url: this.algoServerURL })
  }

  async sendInitialConnectionData (ws) {
    const { Credential } = this.db

    send(ws, ['info.version', VERSION])
    send(ws, ['info.exchanges', ['bitfinex']])

    const [oldAccount] = await Credential.find([
      ['cid', '!=', CREDENTIALS_CID],
      ['mode', '!=', 'paper'],
      ['mode', '!=', 'main']
    ])

    if (oldAccount) {
      oldAccount.mode = 'main'
      await Credential.set(oldAccount)
    }

    const modes = await Credential.find([['cid', '!=', CREDENTIALS_CID]])
    const configuredModes = modes.map((el) => {
      return el.mode
    })

    send(ws, ['info.modes_configured', configuredModes])

    await this.migrateFavs()

    const credentials = await getCredentials(this.db)
    send(ws, ['info.auth_configured', !!credentials])
  }

  async migrateFavs () {
    const { FavouriteTradingPairs } = this.db
    const old = await FavouriteTradingPairs.get('favouriteTradingPairs')

    if (!old) {
      return
    }

    if (!old.pairs || old.pairs.length === 0) {
      return
    }

    const n = await FavouriteTradingPairs.get('main')
    if (n && n.pairs) {
      return
    }

    this.d('old database found... migrating old favs database...')

    await FavouriteTradingPairs.set({ main: 'main', pairs: old.pairs })
  }

  async onWSSConnection (ws) {
    super.onWSSConnection(ws)

    this.exchangeClient.openWS()

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

    this.exchangeClient.close()

    ws.clients = {}
    ws.user = null
  }
}

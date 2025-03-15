'use strict'

const { get: getCredentials } = require('../../db/credentials')
const send = require('../../util/ws/send')
const WSServer = require('../../ws_server')
const { CREDENTIALS_CID } = require('../../db/credentials')

const onSafeClose = require('./handlers/on_safe_close')

const onAuthSubmit = require('./handlers/on_auth_submit')
const onAuthInit = require('./handlers/on_auth_init')
const onAuthReset = require('./handlers/on_auth_reset')

const onSaveStrategy = require('./handlers/on_save_strategy')
const onRemoveStrategy = require('./handlers/on_remove_strategy')
const onSaveAPICredentials = require('./handlers/on_save_api_credentials')
const onResetAPICredentials = require('./handlers/on_reset_api_credentials')
const onAlgoOrderRemove = require('./handlers/on_algo_order_remove')
const onAlgoOrderLoad = require('./handlers/on_algo_order_load')
const onOrderSubmit = require('./handlers/on_order_submit')
const onOrderUpdate = require('./handlers/on_order_update')
const onOrderCancel = require('./handlers/on_order_cancel')
const onAlgoOrderSubmit = require('./handlers/on_algo_order_submit')
const onAlgoOrderCancel = require('./handlers/on_algo_order_cancel')
const onAlgoPause = require('./handlers/on_algo_pause')
const onSettingsUpdate = require('./handlers/on_settings_update')
const onSettingsRequest = require('./handlers/send_settings')
const onCoreSettingsRequest = require('./handlers/on_core_settings_request')
const onOrderHistoryRequest = require('./handlers/on_order_history_request')
const onPastStrategiesRequest = require('./handlers/strategy/past_strategies_request')
const onDecryptedSavedStrategiesRequest = require('./handlers/on_decrypted_saved_strategies_request')

const onRecurringAlgoOrderUpdate = require('./handlers/on_recurring_algo_order_update')
const onRecurringAoOrdersRequest = require('./handlers/on_recur_ao_atomic_orders_request')

const onSaveFavouriteTradingPairs = require('./handlers/on_save_favourite_trading_pairs')
const onFavouriteTradingPairsRequest = require('./handlers/on_favourite_trading_pairs_request')
const onShowAlgoPauseInfoRequest = require('./handlers/on_algo_pause_info_request')
const onAlgoOrderHistoryRequest = require('./handlers/on_algo_order_history_request')
const onAlgoOrderParamsSave = require('./handlers/algo_order_params/set')
const onAlgoOrderParamsRequest = require('./handlers/algo_order_params/get')
const onAlgoOrderParamsRemove = require('./handlers/algo_order_params/remove')
const onSelectedAlgoResumeRemove = require('./handlers/on_selected_algo_resume_remove')

const onLiveStrategyExecutionStart = require('./handlers/strategy/live_strategy_execution_start')
const onLiveStrategyExecutionStop = require('./handlers/strategy/live_strategy_execution_stop')
const onLiveStrategyExecutionStatus = require('./handlers/strategy/live_strategy_execution_status')

const onFeatureFlagsRequest = require('./handlers/on_feature_flags_request')

const onChangeMode = require('./handlers/on_change_mode')

const onDumpErrorLog = require('./handlers/on_dump_error_log')
const onLogFatalErrorEvent = require('./handlers/on_log_fatal_error_event')

const getUserSettings = require('../../util/user_settings')
const algoHost = require('bfx-hf-algo')

const path = require('path')
const Session = require('./session')
const onAlgoOrderHistoryRemove = require('./handlers/on_algo_order_history_remove')

const VERSION = 1

module.exports = class APIWSServer extends WSServer {
  constructor ({
    port,
    server,
    db,
    algoDB,
    strategyExecutionDB,
    restURL,
    wsURL,
    hostedURL,
    metricsServerURL,
    os,
    releaseVersion,
    isRC,
    locale,
    algos,
    logAlgoOpts,
    config,
    dataDir
  }) {
    super({
      port,
      server,
      debugName: 'api',
      msgHandlers: {
        'app.safe_close': onSafeClose,

        'auth.init': onAuthInit,
        'auth.submit': onAuthSubmit,
        'auth.reset': onAuthReset,
        'auth.change_mode': onChangeMode,

        'get.settings': onSettingsRequest,
        'get.core_settings': onCoreSettingsRequest,
        'get.favourite_trading_pairs': onFavouriteTradingPairsRequest,
        'get.show_algo_pause_info': onShowAlgoPauseInfoRequest,
        'get.order_history': onOrderHistoryRequest,
        'get.past_strategies': onPastStrategiesRequest,
        'get.saved_decrypted_strategies': onDecryptedSavedStrategiesRequest,

        'algo_order_params.save': onAlgoOrderParamsSave,
        'algo_order_params.get': onAlgoOrderParamsRequest,
        'algo_order_params.remove': onAlgoOrderParamsRemove,

        'recurring_algo_order.update': onRecurringAlgoOrderUpdate,
        'recurring_algo_order.orders': onRecurringAoOrdersRequest,

        'feature_flags.get': onFeatureFlagsRequest,
        'strategy.execute_start': onLiveStrategyExecutionStart,
        'strategy.execute_stop': onLiveStrategyExecutionStop,
        'strategy.execute_status': onLiveStrategyExecutionStatus,

        'strategy.save': onSaveStrategy,
        'strategy.remove': onRemoveStrategy,
        'api_credentials.save': onSaveAPICredentials,
        'api_credentials.reset': onResetAPICredentials,
        'order.submit': onOrderSubmit,
        'order.update': onOrderUpdate,
        'order.cancel': onOrderCancel,
        'algo_order.submit': onAlgoOrderSubmit,
        'algo_order.load': onAlgoOrderLoad,
        'algo_order.history': onAlgoOrderHistoryRequest,
        'algo_order.history_remove': onAlgoOrderHistoryRemove,
        'algo_order.cancel': onAlgoOrderCancel,
        'algo_order.remove': onAlgoOrderRemove,
        'algo_order.selected_resume_remove': onSelectedAlgoResumeRemove,
        'algo_order.pause': onAlgoPause,
        'settings.update': onSettingsUpdate,
        'favourite_trading_pairs.save': onSaveFavouriteTradingPairs,

        'error_log.dump': onDumpErrorLog,
        'fatal_error.log': onLogFatalErrorEvent
      }
    })

    this.db = db
    this.algoDB = algoDB
    this.strategyExecutionDB = strategyExecutionDB

    this.wsURL = wsURL
    this.restURL = restURL
    this.hostedURL = hostedURL
    this.metricsServerURL = metricsServerURL
    this.os = os
    this.releaseVersion = releaseVersion
    this.isRC = isRC
    this.locale = locale

    this.algos = this._loadAlgos(algos)

    this.logAlgoOpts = logAlgoOpts
    this.config = config
    this.tracerDir = path.join(dataDir, 'traces')

    this.reconnectAlgoHost = this.reconnectAlgoHost.bind(this)
  }

  setMarketData (marketData) {
    this.marketData = marketData
  }

  _loadAlgos (algos) {
    return algos.map((el) => algoHost[el])
  }

  async reconnectAlgoHost (ws) {
    const dms = false
    const algoWorker = ws.getAlgoWorker()

    if (algoWorker && algoWorker.isStarted) {
      algoWorker.reconnect(dms)
    }
  }

  async _sendInitialConnectionData (ws) {
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

    await this._migrateFavs()

    const credentials = await getCredentials(this.db)
    send(ws, ['info.auth_configured', !!credentials])
  }

  async _migrateFavs () {
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
    const session = new Session(ws)

    super.onWSSConnection(session)
    await this._sendInitialConnectionData(session)
  }

  /**
   * @returns {Promise<Object>}
   */
  getUserSettings () {
    return getUserSettings(this.db)
  }

  onWSClose (ws) {
    super.onWSClose(ws)
    ws.closeServices()
  }
}

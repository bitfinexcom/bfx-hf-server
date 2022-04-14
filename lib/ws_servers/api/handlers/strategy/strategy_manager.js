'use strict'

const _isEmpty = require('lodash/isEmpty')
const flatPromise = require('flat-promise')
const { RESTv2 } = require('bfx-api-node-rest')
const { Manager } = require('bfx-api-node-core')
const WDPlugin = require('bfx-api-node-plugin-wd')
const LiveStrategyExecution = require('bfx-hf-strategy-exec')
const { apply: applyI18N } = require('../../../../util/i18n')
const debug = require('debug')('bfx:hf:server:strategy-manager')

class StrategyManager {
  constructor (settings, bcast) {
    const { wsURL, restURL } = settings

    this.wsURL = wsURL
    this.restURL = restURL
    this.d = debug
    this.ws2Manager = null
    this.ws = null
    this.settings = settings
    this.strategy = new Map()

    this.pub = bcast.ws

    this.rest = new RESTv2({ url: restURL, transform: true })
  }

  /**
   * @public
   * @param {string?} apiKey
   * @param {string?} apiSecret
   * @param {string?} authToken
   * @returns {Promise<void>}
   */
  async start ({ apiKey, apiSecret, authToken }) {
    if (this.ws) {
      return
    }

    const { wsURL } = this.settings

    this.ws2Manager = new Manager({
      apiKey,
      apiSecret,
      authToken,
      transform: true,
      wsURL,
      dms: false,
      plugins: [WDPlugin({
        autoReconnect: true, // if false, the connection will only be closed
        reconnectDelay: 5000, // wait 5 seconds before reconnecting
        packetWDDelay: 10000 // set the watch-dog to a 10s delay
      })]
    })

    await this._connect()
  }

  /**
   * @private
   * @returns {Promise<AuthResponse>}
   */
  async _connect () {
    this.d('connecting to ws2 API')
    const { promise: onConnected, resolve, reject } = flatPromise()

    this.ws2Manager.onWS('open', {}, this._onWSOpen.bind(this))
    this.ws2Manager.onceWS('event:auth:success', {}, this._onAuthSuccess.bind(this, resolve))
    this.ws2Manager.onceWS('event:auth:error', {}, this._onAuthError.bind(this, reject))

    this.ws2Manager.openWS()

    await onConnected
  }

  /**
   * @private
   */
  _onWSOpen () {
    this.d('connected to ws2 API')
  }

  /**
   * @private
   * @param {object} resolve - resolve promise
   * @param {object} authResponse - auth response from successful auth
   * @param {object} ws - ws connection
   */
  _onAuthSuccess (resolve, authResponse, ws) {
    this.d('ws2 auth success')

    this.ws = ws

    resolve(authResponse)
  }

  /**
   * @private
   * @param {object} reject - reject promise
   * @param {Error} error - error from incoming event
   */
  _onAuthError (reject, err) {
    this.d('ws2 auth error: %s', err.msg)

    reject(err)
  }

  /**
   * @private
   */
  _registerStrategyExecutionListeners (liveStrategyExecutor, strategyMapKey, strategyOpts) {
    liveStrategyExecutor.on('error', (error) => {
      const errorMessage = error.text || error

      if (/minimum size/.test(errorMessage)) {
        return this._handleMinimumSizeError(errorMessage, strategyMapKey, strategyOpts)
      } else if (/balance/.test(errorMessage)) {
        return this._handleInsufficientBalanceError(errorMessage, strategyMapKey, strategyOpts)
      }
    })
  }

  /**
   * @private
   * @param {Notification|String} err
   */
  _handleMinimumSizeError (err, strategyMapKey, strategyOpts) {
    this.d('received minimum size error [for %s]: %s', strategyMapKey, JSON.stringify(err))
    this.d('stopping strategy execution for %s ...', strategyMapKey)

    this._sendError(err, strategyMapKey, strategyOpts)

    this.close(strategyMapKey)
  }

  /**
   * @private
   * @param {Notification|String} err
   */
  _handleInsufficientBalanceError (err, strategyMapKey, strategyOpts) {
    this.d('received insufficient balance error [for %s]: %s', strategyMapKey, JSON.stringify(err))
    this.d('stopping strategy execution for %s ...', strategyMapKey)

    this._sendError(err, strategyMapKey, strategyOpts)

    this.close(strategyMapKey)
  }

  /**
   * @private
   */
  _sendLiveExecutionStatus () {
    const activeStrategies = this.getActiveStrategies()

    this.pub(['strategy.live_execution_status', !_isEmpty(activeStrategies), activeStrategies])
  }

  /**
   * @private
   * @param msg
   */
  _sendSuccess (msg, i18n) {
    this.pub(['notify', 'success', msg, applyI18N(i18n)])
  }

  /**
   * @private
   * @param {Error|Object|*} err
   */
  _sendError (err, strategyMapKey, { name }) {
    this.pub(['notify', 'error', `Strategy Execution Error[${name}(${strategyMapKey})]: ${err}`])
  }

  _getStrategyMapKey (strategyOpts) {
    const { id, symbol, tf } = strategyOpts

    return `${id}-${symbol}-${tf}`
  }

  /**
   * @public
   * @param {Object} [parsedStrategy] - strategy object as created by define() from bfx-hf-strategy
   * @param {Object} [strategyOpts] - strategy options
   * @param {string} [strategyOpts.symbol] - symbol pair
   * @param {string} [strategyOpts.tf] - timeframe
   * @param {boolean} [strategyOpts.includeTrades] - option to include trades or not
   * @param {number} [strategyOpts.seedCandleCount] - number of candles to seed before strategy execution
   */
  async execute (parsedStrategy = {}, strategyOpts = {}) {
    if (!this.ws) {
      throw new Error('Not authenticated')
    }

    const strategyMapKey = this._getStrategyMapKey(strategyOpts)

    if (this.strategy.has(strategyMapKey)) {
      throw new Error('Strategy with similar options is already running')
    }

    const { ws2Manager, rest, d, ws } = this

    const strategy = {
      ws,
      ...parsedStrategy
    }

    d('executing strategy')

    const liveStrategyExecutor = new LiveStrategyExecution({
      strategy,
      ws2Manager,
      rest,
      strategyOpts
    })

    this._registerStrategyExecutionListeners(liveStrategyExecutor, strategyMapKey, strategyOpts)

    await liveStrategyExecutor.execute()

    const startedOn = Date.now()
    this.strategy.set(strategyMapKey, {
      strategy,
      strategyOpts,
      liveStrategyExecutor,
      startedOn
    })

    const { name, symbol, tf } = strategy
    this._sendSuccess(
      `Started live strategy execution(${name}) for ${symbol}-${tf}`,
      ['startedLiveStrategyExecution', { name, symbol, tf }]
    )

    this.pub(['strategy.live_execution_started', strategyMapKey, { ...strategyOpts, startedOn }])
    this._sendLiveExecutionStatus()
  }

  /**
   * @public
   * @returns {Boolean}
   */
  isActive (strategyMapKey) {
    return this.strategy.has(strategyMapKey)
  }

  /**
   * @public
   * @returns {Array[string]}
   */
  getActiveStrategies () {
    const activeStrategies = [...this.strategy.entries()]
    return activeStrategies.reduce((parsedStrat, strat) => {
      const [key, value] = strat
      const { strategyOpts, startedOn } = value
      parsedStrat[key] = {
        ...strategyOpts,
        startedOn
      }
      return parsedStrat
    }, {})
  }

  /**
   * @private
   */
  _clearStrategy (strategyMapKey) {
    const strategyExists = this.strategy.has(strategyMapKey)
    if (!strategyExists) {
      return
    }
    this.strategy.delete(strategyMapKey)
  }

  /**
   * @public
   */
  async close (strategyMapKey) {
    this.d('closing ws2 api connection')

    const strategy = this.strategy.get(strategyMapKey)
    if (!strategy) {
      return
    }

    const { strategyOpts, liveStrategyExecutor, startedOn } = strategy
    const { name, symbol, tf } = strategyOpts

    if (liveStrategyExecutor) {
      await liveStrategyExecutor.stopExecution()
    }

    this.pub(['strategy.live_execution_results', liveStrategyExecutor.generateResults()])

    this._clearStrategy(strategyMapKey)

    this._sendSuccess(
      `Stopped live strategy execution(${name}) for ${symbol}-${tf}`,
      ['stoppedLiveStrategyExecution', { name, symbol, tf }]
    )

    this.pub(['strategy.live_execution_stopped', strategyMapKey, { ...strategyOpts, startedOn }])
    this._sendLiveExecutionStatus()

    const activeStrategyCount = this.strategy.size
    if (!activeStrategyCount && this.ws2Manager) {
      this.ws2Manager.closeAllSockets()
      this.ws2Manager = null
      this.ws = null
    } else {
      this.d('ws manager not initialized, cannot close sockets')
    }
  }
}

module.exports = StrategyManager

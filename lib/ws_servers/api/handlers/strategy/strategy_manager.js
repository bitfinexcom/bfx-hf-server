'use strict'

const uuid = require('uuid/v4')
const _pick = require('lodash/pick')
const _omit = require('lodash/omit')
const _isEqual = require('lodash/isEqual')
const _isEmpty = require('lodash/isEmpty')
const flatPromise = require('flat-promise')
const { RESTv2 } = require('bfx-api-node-rest')
const WDPlugin = require('bfx-api-node-plugin-wd')
const LiveStrategyExecution = require('bfx-hf-strategy-exec')
const { Manager, findChannelId, unsubscribe } = require('bfx-api-node-core')
const BigNumber = require('bignumber.js')
const { PriceFeed, PerformanceManager, StartWatchers: startPerformanceWatchers } = require('bfx-hf-strategy-perf')

const { apply: applyI18N } = require('../../../../util/i18n')

const debug = require('debug')('bfx:hf:server:strategy-manager')

const CLOSE_CONNECTIONS_DELAY = 60 * 1000 // one minute
const EXECUTION_RESULTS_OMIT_FIELDS = ['candles', 'trades']

class StrategyManager {
  constructor (settings, bcast, strategyExecutionDB) {
    const { wsURL, restURL, closeConnectionsDelay = CLOSE_CONNECTIONS_DELAY } = settings

    this.wsURL = wsURL
    this.restURL = restURL
    this.d = debug
    this.ws2Manager = null
    this.ws = null
    this.settings = settings
    this.strategy = new Map()

    this.pub = bcast.ws

    this.closeConnectionsDelay = closeConnectionsDelay
    this.closeConnectionsTimeout = null

    this.rest = new RESTv2({ url: restURL, transform: true })

    this.strategyExecutionDB = strategyExecutionDB
  }

  /**
   * @public
   * @param {string?} apiKey
   * @param {string?} apiSecret
   * @param {string?} authToken
   * @returns {Promise<void>}
   */
  async start ({ apiKey, apiSecret, authToken }) {
    if (this.closeConnectionsTimeout) {
      clearTimeout(this.closeConnectionsTimeout)
      this.closeConnectionsTimeout = null
    }

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

    liveStrategyExecutor.on('opened_position_data', (positionDetail) => {
      this.pub(['strategy.opened_position_data', strategyMapKey, positionDetail])
    })

    liveStrategyExecutor.on('closed_position_data', (positionDetail) => {
      this.pub(['strategy.closed_position_data', strategyMapKey, positionDetail])
    })

    liveStrategyExecutor.on('rt_execution_results', (results) => {
      this.pub(['strategy.rt_execution_results', strategyMapKey, _omit(results, EXECUTION_RESULTS_OMIT_FIELDS)])
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
  _sendError (err, strategyMapKey, { label }) {
    this.pub(['notify', 'error', `Strategy Execution Error[${label}(${strategyMapKey})]: ${err}`])
  }

  /**
   * @private
   * @param {Object} strategyOpts
   */
  _getChannels (strategyOpts) {
    const { includeTrades, symbol, tf } = strategyOpts
    const candleKey = `trade:${tf}:${symbol}`

    const channels = [
      { channel: 'candles', key: candleKey }
    ]

    if (includeTrades) {
      channels.push({ channel: 'trades', symbol })
    }

    return channels
  }

  /**
   * @public
   * @param {Object} [parsedStrategy] - strategy object as created by define() from bfx-hf-strategy
   * @param {Object} [strategyOpts] - strategy options
   * @param {string} [strategyOpts.symbol] - symbol pair
   * @param {string} [strategyOpts.tf] - timeframe
   * @param {boolean} [strategyOpts.includeTrades] - option to include trades or not
   * @param {number} [strategyOpts.seedCandleCount] - number of candles to seed before strategy execution
   * @param {number} [strategyOpts.allocation]
   * @param {number} [strategyOpts.maxPositionSize]
   * @param {number} [strategyOpts.maxDrawdown]
   * @param {number} [strategyOpts.absStopLoss]
   * @param {number} [strategyOpts.percStopLoss]
   * @param {number} [strategyOpts.exitPositionMode]
   */
  async execute (parsedStrategy = {}, strategyOpts = {}) {
    if (!this.ws) {
      throw new Error('Not authenticated')
    }

    const strategyMapKey = uuid()
    const { ws2Manager, rest, d, ws } = this
    const { allocation, maxPositionSize } = strategyOpts

    const priceFeed = new PriceFeed()
    const perfManager = new PerformanceManager(priceFeed, {
      allocation: new BigNumber(allocation),
      maxPositionSize: new BigNumber(maxPositionSize)
    })
    startPerformanceWatchers(perfManager, strategyOpts)

    const strategy = {
      ...parsedStrategy,
      ws,
      priceFeed,
      perfManager
    }

    d('executing strategy')

    const liveStrategyExecutor = new LiveStrategyExecution({
      strategy,
      ws2Manager,
      rest,
      strategyOpts,
      priceFeed,
      perfManager
    })

    this._registerStrategyExecutionListeners(liveStrategyExecutor, strategyMapKey, strategyOpts)

    await liveStrategyExecutor.execute()

    const startedOn = Date.now()
    this.strategy.set(strategyMapKey, {
      strategy,
      strategyOpts,
      liveStrategyExecutor,
      startedOn,
      priceFeed,
      perfManager,
      channels: this._getChannels(strategyOpts)
    })

    const { label, symbol, tf } = strategy
    this._sendSuccess(
      `Started live strategy execution(${label}) for ${symbol}-${tf}`,
      ['startedLiveStrategyExecution', { label, symbol, tf }]
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

    return Object.fromEntries(activeStrategies.map((strategy) => {
      const [key, value] = strategy
      const { strategyOpts, startedOn } = value
      return [
        key,
        { ...strategyOpts, startedOn }
      ]
    }))
  }

  /**
   * @private
   */
  _clearStrategy (strategyMapKey) {
    this.strategy.delete(strategyMapKey)
  }

  _unsubscribe (unsubscriptionChannel, filter) {
    this.ws2Manager.withDataSocket(({ channel, ...restArgs }) => {
      const fv = _pick(restArgs, Object.keys(filter))
      return unsubscriptionChannel === channel && _isEqual(fv, filter)
    }, (socket) => {
      const chanId = findChannelId(socket, (data) => {
        if (data.channel !== unsubscriptionChannel) {
          return false
        }

        const fv = _pick(data, Object.keys(filter))
        return _isEqual(filter, fv)
      })

      if (!chanId) {
        return this.d('error unsubscribing: unknown %s channel [%o]', unsubscriptionChannel, filter)
      }

      const nextSocket = unsubscribe(socket, chanId)

      return nextSocket
    })
  }

  /**
   * @private
   */
  _unsubscribeChannels (channels, strategyMapKey) {
    const candleChannelIndex = channels.findIndex(({ channel }) => channel === 'candles')
    const tradeChannelIndex = channels.findIndex(({ channel }) => channel === 'trades')

    let unsubscribeCandles = candleChannelIndex !== -1
    let unsubscribeTrades = tradeChannelIndex !== -1

    if ((!unsubscribeCandles && !unsubscribeTrades) || !this.ws2Manager) {
      return
    }

    const strategyEntries = this.strategy.entries()

    for (const [strategyKey, strategy] of strategyEntries) {
      if (!unsubscribeCandles && !unsubscribeTrades) {
        break
      }

      if (strategyKey !== strategyMapKey) {
        channels.forEach(({ channel, ...filter }) => {
          if (channel === 'candles' && unsubscribeCandles) {
            const index = strategy.channels.findIndex(({ channel }) => channel === 'candles')
            if (index !== -1) {
              const fv = _pick(strategy.channels[index], Object.keys(filter))
              unsubscribeCandles = !_isEqual(fv, filter)
            }
          } else if (channel === 'trades' && unsubscribeTrades) {
            const index = strategy.channels.findIndex(({ channel }) => channel === 'trades')
            if (index !== -1) {
              const fv = _pick(strategy.channels[index], Object.keys(filter))
              unsubscribeTrades = !_isEqual(fv, filter)
            }
          }
        })
      }
    }

    if (unsubscribeCandles && candleChannelIndex !== -1) {
      const { channel, ...filter } = channels[candleChannelIndex]
      this._unsubscribe(channel, filter)
    }

    if (unsubscribeTrades && tradeChannelIndex !== -1) {
      const { channel, ...filter } = channels[tradeChannelIndex]
      this._unsubscribe(channel, filter)
    }
  }

  /**
   * @private
   */
  async _saveStrategyExecutionResults (strategyMapKey, saveOpts) {
    const { strategy, strategyExecutionResults } = saveOpts
    const { strategyOpts = {}, startedOn } = strategy
    const { id: strategyId = '', label, symbol } = strategyOpts

    const { StrategyExecution } = this.strategyExecutionDB

    await StrategyExecution.set({
      id: strategyMapKey,
      label,
      symbol,
      strategyId,
      strategyOpts,
      startedOn,
      stoppedOn: Date.now(),
      results: _omit(strategyExecutionResults, EXECUTION_RESULTS_OMIT_FIELDS)
    })
  }

  /**
   * @private
   */
  _closeAllSocketsIfInactive () {
    const activeStrategyCount = this.strategy.size
    if (activeStrategyCount !== 0) {
      return
    }

    if (!this.ws2Manager) {
      this.d('ws manager not initialized, cannot close sockets')
      return
    }

    const closeAllSockets = () => {
      this.d('closing ws2 api connection')

      this.ws2Manager.closeAllSockets()
      this.ws2Manager = null
      this.ws = null
    }

    this.closeConnectionsTimeout = setTimeout(closeAllSockets, this.closeConnectionsDelay)
  }

  async stopAllActiveStrategies () {
    const strategyMapKeys = this.strategy.keys()
    for (const key of strategyMapKeys) {
      await this.close(key)
    }
  }

  /**
   * @public
   */
  async close (strategyMapKey) {
    const strategy = this.strategy.get(strategyMapKey)
    if (!strategy) {
      return
    }

    const { strategyOpts, liveStrategyExecutor, startedOn, priceFeed, perfManager } = strategy
    const { label, symbol, tf } = strategyOpts

    let strategyExecutionResults = {}

    if (liveStrategyExecutor) {
      await liveStrategyExecutor.stopExecution()
      strategyExecutionResults = liveStrategyExecutor.generateResults()
    }

    this.pub(['strategy.live_execution_results', strategyMapKey, strategyExecutionResults])

    priceFeed.close()
    perfManager.close()

    this._unsubscribeChannels(strategy.channels, strategyMapKey)
    this._clearStrategy(strategyMapKey)

    this._sendSuccess(
      `Stopped live strategy execution(${label}) for ${symbol}-${tf}`,
      ['stoppedLiveStrategyExecution', { label, symbol, tf }]
    )

    this.pub(['strategy.live_execution_stopped', strategyMapKey, { ...strategyOpts, startedOn }])
    this._sendLiveExecutionStatus()

    await this._saveStrategyExecutionResults(strategyMapKey, { strategy, strategyExecutionResults })

    this._closeAllSocketsIfInactive()
  }
}

module.exports = StrategyManager

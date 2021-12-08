'use strict'

const EventEmitter = require('events')
const flatPromise = require('flat-promise')
const { RESTv2 } = require('bfx-api-node-rest')
const { Manager } = require('bfx-api-node-core')
const WDPlugin = require('bfx-api-node-plugin-wd')
const execStrategy = require('bfx-hf-strategy-exec')
const { apply: applyI18N } = require('../../../../util/i18n')
const debug = require('debug')('bfx:hf:server:strategy-manager')

class StrategyManager {
  constructor (settings, bcast) {
    const { wsURL, restURL } = settings

    this.wsURL = wsURL
    this.restURL = restURL
    this.d = debug
    this.ws2Manager = null
    this.settings = settings
    this.strategy = {}
    this.strategyArgs = {}
    this.active = false

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
    const { dms, wsURL } = this.settings

    this.ws2Manager = new Manager({
      apiKey,
      apiSecret,
      authToken,
      transform: true,
      wsURL,
      dms,
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
    
    this.strategy.ws = ws
    this.executeStrategyConn = new EventEmitter()
    
    this._registerStrategyExecutionListeners()

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
   _registerStrategyExecutionListeners() {
    this.executeStrategyConn.on('error', (error) => {
      const errorMessage = error.text || error

      if (/minimum size/.test(errorMessage)) {
        return this._handleMinimumSizeError(errorMessage)
      } else if (/balance/.test(errorMessage)) {
        return this._handleInsufficientBalanceError(errorMessage)
      }
    })
  }

  /**
   * @private
   * @param {Notification|String} err
   */
  _handleMinimumSizeError(err) {
    this.d('received minimum size error: %s', JSON.stringify(err))
    this.d('stopping strategy execution...')
    
    this._sendError(err)
    
    this.close()
  }

  /**
   * @private
   * @param {Notification|String} err
   */
  _handleInsufficientBalanceError(err) {
    this.d('received insufficient balance error: %s', JSON.stringify(err))
    this.d('stopping strategy execution...')
    
    this._sendError(err)
    
    this.close()
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
  _sendError (err) {
    this.pub(['notify', 'error', `Strategy Execution Error: ${err}`])
  }

  /**
   * @public
   * @param {Object} [strategy] - strategy object
   * @param {Object} [strategyArgs] - strategy options
   * @param {string} [strategyArgs.symbol] - symbol pair
   * @param {string} [strategyArgs.tf] - timeframe
   * @param {boolean} [strategyArgs.includeTrades] - option to include trades or not
   * @param {number} [strategyArgs.seedCandleCount] - number of candles to seed before strategy execution
   */
  async execute (strategy = {}, strategyOpts = {}) {
    if (!this.strategy.ws) {
      throw new Error('Not authenticated')
    }

    const { ws2Manager, rest, d } = this

    this._setStrategyArgs(strategyOpts)

    d('executing strategy')

    this.strategy = {
      ...this.strategy,
      ...strategy
    }

    await execStrategy(this.strategy, ws2Manager, rest, strategyOpts, this.executeStrategyConn)

    this._setActiveStatus(true)

    const { name, symbol, tf } = this.strategy
    this._sendSuccess(
      `Started live strategy execution(${name}) for ${symbol}-${tf}`, 
      ['startedLiveStrategyExecution', { name, symbol, tf }]
    )
  }

  /**
   * @public
   * @returns {boolean}
   */
  isActive () {
    return this.active
  }

  /**
   * @public
   * @returns {object}
   */
  getStrategyArgs () {
    return this.strategyArgs
  }

  /**
   * @private
   * @param {Object} [args] - strategy options
   * @param {string} [args.id] - strategy id
   * @param {string} [args.symbol] - symbol pair
   * @param {string} [args.tf] - timeframe
   * @param {boolean} [args.includeTrades] - option to include trades or not
   * @param {number} [args.seedCandleCount] - number of candles to seed before strategy execution
   */
  _setStrategyArgs (args = {}) {
    this.strategyArgs = {
      ...this.strategyArgs,
      ...args
    }
  }

  /**
   * @private
   * @param {boolean} status
   */
  _setActiveStatus (status) {
    this.active = status
  }

  /**
   * @private
   */
  _clearStrategy () {
    this.strategy = {}
  }

  /**
   * @public
   */
   close () {
    this.d('closing ws2 api connection')
    
    if(this.executeStrategyConn){
      this.executeStrategyConn.removeAllListeners()
    }
    
    const { name, symbol, tf } = this.strategy

    if (this.ws2Manager) {
      this.ws2Manager.closeAllSockets()
      this.pub(['strategy.live_execution_status', false, {}])

      this._setActiveStatus(false)
      this._clearStrategy()
    } else {
      this.d('ws manager not initialized, cannot close sockets')
    }
    
    this._sendSuccess(
      `Stopped live strategy execution(${name}) for ${symbol}-${tf}`, 
      ['stoppedLiveStrategyExecution', { name, symbol, tf }]
    )
  }
}

module.exports = StrategyManager

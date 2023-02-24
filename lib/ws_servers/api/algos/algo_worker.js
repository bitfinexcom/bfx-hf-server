'use strict'

const debug = require('debug')
const d = debug('bfx:hf:server:algo-worker')
const { AOHost, Recurring } = require('bfx-hf-algo')

const { apply: applyI18N } = require('../../../util/i18n')
const validateAO = require('./util/validate_ao')
const { requiredPermissions, hasRequiredPermissions } = require('../../../util/validate_credentials')
const { DMS_ENABLED } = require('../../../constants')
const isAddrInfoError = require('../../../util/is_addr_info_error')
const filterMarketData = require('../../../util/filter_market_data')

class AlgoWorker {
  constructor (settings, algoOrders, bcast, algoDB, logAlgoOpts, marketData) {
    this.host = null
    this.userId = null
    this.isStarted = false

    this.settings = settings
    this.algoOrders = algoOrders

    this.pub = bcast

    this.algoDB = algoDB
    this.logAlgoOpts = logAlgoOpts
    this.marketData = marketData
  }

  /**
   * @public
   * @param {string?} apiKey
   * @param {string?} apiSecret
   * @param {string?} authToken
   * @param {string?} userId
   * @returns {Promise<void>}
   */
  async start ({ apiKey, apiSecret, authToken, userId }) {
    const { dms, affiliateCode, wsURL, restURL, plugins = [], signalTracerOpts } = this.settings

    this.userId = userId
    this.isOpen = true

    d(
      'spawning bfx algo host (dms %s) [aff %s]',
      dms ? 'enabled' : 'disabled',
      affiliateCode
    )

    const wsSettings = {
      apiKey,
      apiSecret,
      authToken,
      dms: dms ? DMS_ENABLED : 0,
      withHeartbeat: true,
      affiliateCode,
      wsURL,
      restURL,
      plugins
    }

    const host = new AOHost({
      aos: this.algoOrders,
      logAlgoOpts: this.logAlgoOpts,
      wsSettings,
      signalTracerOpts
    })

    this.host = host
    this.registerEvents()

    const { caps } = await host.connect()
    if (!hasRequiredPermissions(caps)) {
      const permissionList = Object.values(requiredPermissions)
        .map(str => `"${str}"`)
        .join(', ')

      throw new Error(`The given API key does not have the required permissions, please make sure to enable ${permissionList}`)
    }

    d('spawned host for %s', userId)

    this.pub(['opened', userId, 'bitfinex'])

    this.isStarted = true
  }

  /**
   * @public
   * @returns {boolean}
   */
  isHostAvailable () {
    return this.host && this.isStarted
  }

  /**
   *
   * @param {'paper' | 'main'} mode
   * @param aos
   * @private
   */
  _getActiveAlgosByMode (mode, aos) {
    const isPaper = mode === 'paper' ? 1 : 0
    const markets = filterMarketData(this.marketData, m => m.p === isPaper)
    const avPairs = new Set(markets.map(({ wsID }) => wsID))

    return aos
      .map(ao => {
        return {
          ...ao,
          state: JSON.parse(ao.state)
        }
      })
      .filter((ao) => {
        const pair = ao.state.args.symbol
        return avPairs.has(pair)
      })
      .map(({ gid, createdAt, algoID, state, lastActive }) => {
        const { args, label, name, alias = label } = state
        return { args, gid, alias, createdAt, algoID, label, name, lastActive }
      })
  }

  async sendActiveAlgosForAllModes (isAfterLogin) {
    const aos = await this.getActiveAlgosFromDB()

    this.pub(['data.aos', 'bitfinex', 'paper', isAfterLogin, this._getActiveAlgosByMode('paper', aos)])
    this.pub(['data.aos', 'bitfinex', 'main', isAfterLogin, this._getActiveAlgosByMode('main', aos)])
  }

  getActiveAlgosFromDB () {
    const { AlgoOrder } = this.algoDB

    return AlgoOrder.find([
      ['active', '=', true],
      ['algoID', '!=', Recurring.id]
    ])
  }

  getActiveAlgosFromHost () {
    return this.host.getAOInstances()
      .filter((aoInstance) => {
        const { state = {} } = aoInstance
        const { active } = state
        return active
      })
  }

  /**
   * @public
   */
  close () {
    this.isOpen = false
    if (this.host) {
      this.host.removeAllListeners()
      this.host.close()
      this.host.cleanState()
    }
  }

  /**
   * @public
   * @param {Object} args
   * @param {string?} args.apiKey
   * @param {string?} args.apiSecret
   * @param {string?} args.authToken
   * @param {number?} args.dms
   * @param {number?} args.calc
   * @returns {void}
   */
  updateAuthArgs (args = {}) {
    if (!this.isHostAvailable()) {
      return
    }

    const adapter = this.host.getAdapter()
    if (!adapter.updateAuthArgs) return

    adapter.updateAuthArgs(args)
  }

  /**
   * @public
   * @param {number?} dms
   */
  reconnect (dms) {
    if (!this.isHostAvailable()) {
      return
    }

    this.updateAuthArgs({ dms: dms ? DMS_ENABLED : 0 })

    this.host.reconnect()
    d('issued reconnect [dms %s]', dms)
  }

  /**
   * @private
   */
  registerEvents () {
    this.host.on('error', (error) => {
      this.sendError(error)
    })

    this.host.on('meta:reload', async () => {
      d('meta reloaded')
      this.pub(['algo.reload'])
      await this.sendActiveAlgosForAllModes(false)
    })

    this.host.on('ao:stopped', async (data) => {
      const { mode } = this.settings
      const [gid, serialized] = data

      serialized.active = false
      await this._updateAlgo(serialized)

      this.sendSuccess('Stopped algo order', ['stoppedAO'])
      this.pub(['data.ao.stopped', 'bitfinex', mode, gid])
      d('stopped AO for user %s on gid: %s', this.userId, gid)
    })
  }

  /**
   * @private
   * @param {Object} updateOpts
   * @param {number} updateOpts.gid
   * @returns {Promise<void>}
   */
  async _updateAlgo (updateOpts) {
    const { AlgoOrder } = this.algoDB
    await AlgoOrder.set(updateOpts)
    d('ao instance updated %s', updateOpts.gid)
  }

  async _getSerializedAO (gid) {
    if (!this.isHostAvailable()) {
      return Promise.reject(new Error('Internal error, host is not available'))
    }

    const { host } = this

    const instance = host.getAOInstance(gid)
    if (!instance) {
      const error = new Error('Requested algo order not running, cannot stop')

      error.i18n = applyI18N(['requestedAlgoOrderNotRunningCannotStop'])
      throw error
    }

    return host.getSerializedAO(instance)
  }

  /**
   * @public
   * @returns {Promise<void>}
   */
  async storeState () {
    if (!this.isHostAvailable()) {
      return
    }

    const algos = this.host.getSerializedAlgos()

    await Promise.all(
      algos.map(async (updateOpts) => {
        await this._updateAlgo(updateOpts)
      })
    )
  }

  /**
   * @private
   * @param msg
   */
  sendSuccess (msg, i18n) {
    this.pub(['notify', 'success', msg, applyI18N(i18n)])
  }

  /**
   * @private
   * @param {Error|Object|*} err
   */
  sendError (err) {
    const errMsg = err.message || err.msg || JSON.stringify(err)
    if (isAddrInfoError(errMsg)) return

    this.pub(['notify', 'error', errMsg])
  }

  /**
   * @public
   * @param {string} gid
   * @returns {Promise<void>}
   */
  async cancelOrder (gid) {
    const serialized = await this._getSerializedAO(gid)
    serialized.active = false
    await this._updateAlgo(serialized)

    await this.host.stopAO(gid)
  }

  /**
   * @public
   * @param {string} gid
   * @param {number} lastActive
   * @returns {Promise<void>}
   */
  async updateLastActive (gid, lastActive) {
    const serialized = await this._getSerializedAO(gid)
    serialized.lastActive = lastActive
    await this._updateAlgo(serialized)
  }

  /**
   * @public
   * @param {string} aoID
   * @param {Object} order
   * @returns {Promise<void>}
   */
  submitOrder (aoID, order) {
    if (!this.isHostAvailable()) {
      return Promise.reject(new Error('Internal error, host is not available'))
    }

    const { host, marketData } = this

    const validationError = validateAO(host, marketData, aoID, order)

    if (validationError) {
      throw validationError
    }

    const ao = host.startAO(aoID, order)
    return this.runOrder(aoID, ao)
  }

  /**
   * @public
   * @param {string} aoID
   * @param {string} gid
   * @param {Object} state
   * @param {number} createdAt
   * @returns {Promise<void>}
   */
  loadOrder (aoID, gid, state, createdAt) {
    if (!this.isHostAvailable()) {
      return Promise.reject(new Error('Internal error, host is not available'))
    }

    const ao = this.host.loadAO(aoID, gid, state, createdAt)
    return this.runOrder(aoID, ao)
  }

  /**
   * @private
   * @param {string} aoID
   * @param {Promise<Object[]>} ao
   * @returns {Promise<void>}
   */
  async runOrder (aoID, ao) {
    const { mode } = this.settings

    try {
      const [serialized, uiData] = await ao
      const { id, name, alias, label, args, gid, i18n, createdAt } = uiData
      const lastActive = serialized.lastActive || createdAt

      d('ao started: %s %s', alias, label)

      await this._updateAlgo(serialized)

      this.sendSuccess(`Started AO ${alias} on Bitfinex`, ['startedAO', { alias, target: 'Bitfinex' }])
      this.pub(['data.ao', 'bitfinex', mode, { id, gid, alias, name, label, args, i18n, createdAt, lastActive }])
      return gid
    } catch (e) {
      d('error starting AO %s: %s for %s: %s', aoID, e, this.userId, e.stack)

      throw new Error('Failed to start algo order')
    }
  }
}

module.exports = AlgoWorker

'use strict'

const debug = require('debug')
const d = debug('bfx:hf:server:algo-worker')
const { AOHost } = require('bfx-hf-algo')
const PluginBfxAdapter = require('bfx-hf-token-renewal-plugin/lib/adapters/bitfinex-adapter')
const TokenRenewalPlugin = require('bfx-hf-token-renewal-plugin')

const validateAO = require('./util/validate_ao')
const { DMS_ENABLED } = require('../../../constants')

class AlgoWorker {
  constructor (settings, algoOrders, bcast, algoDB, logAlgoOpts, marketData, config = {}) {
    this.host = null
    this.userId = null
    this.isStarted = false
    this.tokenPlugin = null

    const { auth: authConfig = {} } = config
    this.authConfig = authConfig
    this.settings = settings
    this.algoOrders = algoOrders

    this.pub = bcast.ws

    this.algoDB = algoDB
    this.logAlgoOpts = logAlgoOpts
    this.marketData = marketData
  }

  async start ({ apiKey, apiSecret, authToken, userId }) {
    const { dms, affiliateCode, wsURL, restURL, plugins = [] } = this.settings

    this.userId = userId

    d(
      'spawning bfx algo host (dms %s) [aff %s]',
      dms ? 'enabled' : 'disabled',
      affiliateCode
    )

    if (!authToken) {
      const adapter = new PluginBfxAdapter({
        url: restURL,
        apiKey,
        apiSecret,
        ttl: this.authConfig.tokenTtlInSeconds
      })
      const res = await adapter.refreshToken()
      authToken = res.authToken

      this.tokenPlugin = new TokenRenewalPlugin(adapter)

      plugins.push(this.tokenPlugin)
    }

    const wsSettings = {
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
      wsSettings
    })

    this.host = host
    this.registerEvents()

    host.connect()
    d('spawned host for %s', userId)

    this.pub(['opened', userId, 'bitfinex'])

    this.sendActiveAlgos()
    this.isStarted = true
  }

  sendActiveAlgos () {
    const instances = this.host.getAOInstances()
    const activeInstances = instances.filter((aoInstance) => {
      const { state = {} } = aoInstance
      const { active } = state
      return active
    })

    const algos = activeInstances.map((aoInstance) => {
      const { state = {} } = aoInstance
      const { gid, name, args, label } = state

      return [gid, name, label, args]
    })

    this.pub(['data.aos', 'bitfinex', algos])
  }

  close () {
    if (this.tokenPlugin) {
      this.tokenPlugin.close()
    }
    if (this.host) {
      this.host.removeAllListeners()
      this.host.close()
      this.host.cleanState()
    }
  }

  updateAuthArgs (args = {}) {
    const adapter = this.host.getAdapter()

    if (adapter.updateAuthArgs) {
      adapter.updateAuthArgs(args)
    }
  }

  reconnect (dms) {
    if (!this.host) {
      return
    }

    this.updateAuthArgs({ dms: dms ? DMS_ENABLED : 0 })

    this.host.reconnect()
    d('issued reconnect [dms %s]', dms)
  }

  registerEvents () {
    this.host.on('error', (error) => {
      this.sendError(error)
    })

    this.host.on('meta:reload', async () => {
      d('meta reloaded')
      this.pub(['algo.reload'])
    })

    this.host.on('ao:stopped', async (data) => {
      const [gid, serialized] = data

      serialized.active = false
      await this._updateAlgo(serialized)

      this.sendSuccess('Stopped algo order')
      this.pub(['data.ao.stopped', 'bitfinex', gid])
      d('stopped AO for user %s on gid: %s', this.userId, gid)
    })
  }

  async _updateAlgo (updateOpts) {
    const { AlgoOrder } = this.algoDB
    await AlgoOrder.set(updateOpts)
    d('ao instance updated %s', updateOpts.gid)
  }

  async storeState () {
    const { host } = this

    const algos = host.getSerializedAlgos()

    await Promise.all(
      algos.map(async (updateOpts) => {
        await this._updateAlgo(updateOpts)
      })
    )
  }

  sendSuccess (msg) {
    this.pub(['notify', 'success', msg])
  }

  sendError (err) {
    this.pub(['notify', 'error', err.message || err.msg || JSON.stringify(err)])
  }

  async cancelOrder (gid) {
    const { host } = this

    const instance = host.getAOInstance(gid)
    if (!instance) {
      throw new Error('Requested algo order not running, cannot stop')
    }

    const serialized = host.getSerializedAO(instance)
    serialized.active = false
    this._updateAlgo(serialized)

    await host.stopAO(gid)
  }

  async submitOrder (aoID, order) {
    const { host, marketData } = this

    const validationError = validateAO(host, marketData, aoID, order)

    if (validationError) {
      throw new Error(validationError)
    }

    try {
      const [serialized, uiData] = await host.startAO(aoID, order)
      const { name, label, args, gid } = uiData
      d('ao started: %s %s', name, label)

      this._updateAlgo(serialized)

      this.sendSuccess(`Started AO ${name} on Bitfinex`)
      this.pub(['data.ao', 'bitfinex', { gid, name, label, args }])
    } catch (e) {
      d('error starting AO %s: %s for %s: %s', aoID, e, this.userId, e.stack)

      throw new Error('Failed to start algo order')
    }
  }
}

module.exports = AlgoWorker

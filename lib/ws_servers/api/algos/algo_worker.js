'use strict'

const debug = require('debug')
const d = debug('bfx:hf:server:algo-worker')

const { AOHost } = require('bfx-hf-algo')

const validateAO = require('./util/validate_ao')
const { DMS_ENABLED } = require('../../../constants')

class AlgoWorker {
  constructor (settings, algoOrders, bcast, algoDB, logAlgoOpts) {
    this.host = null
    this.userID = null
    this.isStarted = false

    this.settings = settings
    this.algoOrders = algoOrders

    this.pub = bcast.ws

    this.algoDB = algoDB
    this.logAlgoOpts = logAlgoOpts
  }

  async start (apiKey, apiSecret, userID) {
    const { dms, affiliateCode, wsURL, restURL } = this.settings

    this.userID = userID

    d(
      'spawning bfx algo host (dms %s) [aff %s]',
      dms ? 'enabled' : 'disabled',
      affiliateCode
    )

    const wsSettings = {
      apiKey,
      apiSecret,
      dms: dms ? DMS_ENABLED : 0,
      withHeartbeat: true,
      affiliateCode,
      wsURL,
      restURL
    }

    const host = new AOHost({
      aos: this.algoOrders,
      logAlgoOpts: this.logAlgoOpts,
      wsSettings
    })

    this.host = host
    this.registerEvents()

    host.connect()
    d('spawned host for %s', userID)

    this.pub(['opened', userID, 'bitfinex'])

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
    if (!this.host) {
      return
    }

    this.host.removeAllListeners()
    this.host.close()
    this.host.cleanState()
  }

  reconnect (dms) {
    if (!this.host) {
      return
    }

    const adapter = this.host.getAdapter()

    if (adapter.updateAuthArgs) {
      adapter.updateAuthArgs({ dms: dms ? DMS_ENABLED : 0 })
    }

    this.host.reconnect()
    d('issued reconnect [dms %s]', dms)
  }

  registerEvents () {
    this.host.on('error', (error) => {
      this.sendError(`error: ${error}`)
    })

    this.host.on('meta:reload', async () => {
      d('meta reloaded')
      this.pub(['algo.reload'])
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

  sendError (msg) {
    this.pub(['notify', 'error', msg])
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

    this.sendSuccess('Stopped algo order')
    this.pub(['data.ao.stopped', 'bitfinex', gid])

    d('stopped AO for user %s on gid: %s', this.userID, gid)
  }

  async submitOrder (aoID, order) {
    const { host } = this

    const validationError = validateAO(host, aoID, order)

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
      d('error starting AO %s: %s for %s: %s', aoID, e, this.userID, e.stack)

      throw new Error('Failed to start algo order')
    }
  }
}

module.exports = AlgoWorker

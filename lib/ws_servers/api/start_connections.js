'use strict'

const { DEFAULT_USER } = require('../../constants')

const createClient = require('./open_auth_bitfinex_connection')
const createAlgoWorker = require('./factories/create_algo_worker')
const createDmsControl = require('./factories/create_dms_control')
const createStrategyManager = require('./factories/create_strategy_manager')
const getUserSettings = require('../../util/user_settings')
const capture = require('../../capture')

class ConnectionManager {
  constructor () {
    this.starting = false
    this.mode = null
    this.scope = null
    this.credentials = {
      main: { apiKey: null, apiSecret: null },
      paper: { apiKey: null, apiSecret: null }
    }
  }

  /**
   * @param args.server
   * @param args.ws
   * @param args.db
   * @param args.d
   * @param args.apiKey
   * @param args.apiSecret
   * @param args.wsURL
   * @param args.restURL
   * @param args.dmsScope
   * @param args.mode
   * @param args.isPaper
   * @returns {Promise<void>}
   */
  async start (args) {
    if (this.starting) return
    this.starting = true

    try {
      const { apiKey, apiSecret, dmsScope: scope, mode } = args
      const currentCredentials = this.credentials[mode]
      const hasNewCredentials = apiKey !== currentCredentials.apiKey || apiSecret !== currentCredentials.apiSecret

      this._updateCredentials({ mode, apiKey, apiSecret, scope })

      await this._startDmsControl(args)
      await this._startAlgoWorker(args, hasNewCredentials)
      this._startBfxClient(args, hasNewCredentials)
      this._startStrategyManager(args)
    } catch (err) {
      capture.exception(err)
    } finally {
      this.starting = false
    }
  }

  /**
   * @param {APIWSServer} server
   * @param {Session} ws
   * @param {boolean} dms
   * @returns {Promise<*>}
   */
  async updateDms (server, ws, dms) {
    if (!this.scope) {
      return
    }

    let dmsControl = ws.getDmsControl()

    if (dmsControl && dmsControl.isOpen) {
      dmsControl.updateStatus(dms)
      return
    }

    if (!dms) {
      return
    }

    dmsControl = createDmsControl(server)
    ws.setDmsControl(dmsControl)

    const { apiKey, apiSecret } = this._getCredentials()
    return await dmsControl.open({
      apiKey,
      apiSecret,
      scope: this.scope
    })
  }

  /**
   * @param {"paper"|"main"} mode
   * @returns {{ apiKey: string, apiSecret: string }}
   * @private
   */
  _getCredentials (mode = this.mode) {
    return this.credentials[mode]
  }

  _updateCredentials ({ mode, apiKey, apiSecret, scope }) {
    this.mode = mode
    this.credentials[mode] = { apiKey, apiSecret }
    this.scope = scope
  }

  /**
   * @param {APIWSServer}
   * @param {Session} ws
   * @param db
   * @returns {Promise<void>}
   * @private
   */
  async _startDmsControl ({ server, ws, db }) {
    const { dms } = await getUserSettings(db)
    await this.updateDms(server, ws, dms)
  }

  /**
   * @private
   */
  async _startAlgoWorker ({ server, ws, apiKey, apiSecret, mode, userId = DEFAULT_USER }, shouldUpdate = false) {
    let algoWorker = ws.getAlgoWorker()
    if (algoWorker && algoWorker.isOpen && !shouldUpdate) {
      return
    }

    algoWorker = await createAlgoWorker(server, ws)
    ws.setAlgoWorker(algoWorker)

    await algoWorker.start({ apiKey, apiSecret, userId })
  }

  /**
   * @private
   */
  _startBfxClient ({ ws, ...args }, shouldUpdate = false) {
    let client = ws.getClient()
    if (client && client.isOpen && !shouldUpdate) {
      return
    }

    client = createClient({
      ...args,
      ws,
      dms: false
    })

    ws.setClient(client)
  }

  /**
   * @param {APIWSServer} server
   * @param {Session} ws
   * @private
   */
  _startStrategyManager ({ server, ws }) {
    let strategyManager = ws.getStrategyManager()
    if (strategyManager) {
      return
    }

    strategyManager = createStrategyManager(server, ws)
    ws.setStrategyManager(strategyManager)
  }
}

module.exports = new ConnectionManager()

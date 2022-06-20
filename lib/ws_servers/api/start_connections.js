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
    this.isStartingServices = false
    this.credentials = {
      main: { apiKey: null, apiSecret: null },
      paper: { apiKey: null, apiSecret: null }
    }
  }

  /**
   * @param {APIWSServer} args.server
   * @param {Session} args.ws
   * @param {string} args.apiKey
   * @param {string} args.apiSecret
   * @param {string} args.scope
   * @param {string} args.mode
   * @param {boolean} args.isPaper
   * @returns {Promise<void>}
   */
  async start (args) {
    if (this.isStartingServices) return
    this.isStartingServices = true

    try {
      const { apiKey, apiSecret, mode } = args
      const currentCredentials = this.credentials[mode]
      const hasNewCredentials = apiKey !== currentCredentials.apiKey || apiSecret !== currentCredentials.apiSecret
      this.credentials[mode] = { apiKey, apiSecret }

      await this._startDmsControl(args)
      await this._startAlgoWorker(args, hasNewCredentials)
      this._startBfxClient(args, hasNewCredentials)
      this._startStrategyManager(args)
    } catch (err) {
      capture.exception(err)
    } finally {
      this.isStartingServices = false
    }
  }

  /**
   * @param {APIWSServer} server
   * @param {Session} ws
   * @param {boolean} dms
   * @param {string} dmsScope
   * @returns {Promise<*>}
   */
  async updateDms (server, ws, dms, dmsScope) {
    if (!dmsScope) {
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

    const { apiKey, apiSecret } = this.credentials[ws.mode]
    return await dmsControl.open({
      apiKey,
      apiSecret,
      dmsScope
    })
  }

  /**
   * @param {APIWSServer}
   * @param {Session} ws
   * @param {string} scope
   * @returns {Promise<void>}
   * @private
   */
  async _startDmsControl ({ server, ws, scope }) {
    const { db } = server
    const { dmsScope } = ws
    const { dms } = await getUserSettings(db)
    await this.updateDms(server, ws, dms, dmsScope)
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
  _startBfxClient (args, shouldUpdate = false) {
    const {
      server,
      ws,
      apiKey,
      apiSecret,
      isPaper,
      scope
    } = args
    const { d, wsURL, restURL } = server

    let client = ws.getClient()
    if (client && client.isOpen && !shouldUpdate) {
      return
    }

    client = createClient({
      apiKey,
      apiSecret,
      d,
      wsURL,
      restURL,
      isPaper,
      dmsScope,
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

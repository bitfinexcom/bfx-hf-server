'use strict'

const _isEqual = require('lodash/isEqual')

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
   * @param {APIWSServer} server
   * @param {Session} ws
   * @returns {Promise<void>}
   */
  async start (server, ws) {
    if (this.isStartingServices) return
    this.isStartingServices = true

    try {
      const { mode } = ws
      const currentCredentials = ws.getCredentials()
      const prevCredentials = this.credentials[mode]
      const hasNewCredentials = !_isEqual(currentCredentials, prevCredentials)
      this.credentials[mode] = currentCredentials

      await this._startDmsControl(server, ws)
      await this._startAlgoWorker(server, ws, hasNewCredentials)
      this._startBfxClient(server, ws, hasNewCredentials)
      this._startStrategyManager(server, ws)
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
   * @param {APIWSServer} server
   * @param {Session} ws
   * @returns {Promise<void>}
   * @private
   */
  async _startDmsControl (server, ws) {
    const { db } = server
    const { dmsScope } = ws
    const { dms } = await getUserSettings(db)
    await this.updateDms(server, ws, dms, dmsScope)
  }

  /**
   * @param {APIWSServer} server
   * @param {Session} ws
   * @param {boolean} shouldUpdate
   * @private
   */
  async _startAlgoWorker (server, ws, shouldUpdate = false) {
    let algoWorker = ws.getAlgoWorker()
    if (algoWorker && algoWorker.isOpen && !shouldUpdate) {
      return
    }

    algoWorker = await createAlgoWorker(server, ws)
    ws.setAlgoWorker(algoWorker)

    const { apiKey, apiSecret } = ws.getCredentials()
    const userId = DEFAULT_USER
    await algoWorker.start({ apiKey, apiSecret, userId })
  }

  /**
   * @param {APIWSServer} server
   * @param {Session} ws
   * @param {boolean} shouldUpdate
   * @private
   */
  _startBfxClient (server, ws, shouldUpdate = false) {
    const { d, wsURL, restURL } = server

    let client = ws.getClient()
    if (client && client.isOpen && !shouldUpdate) {
      return
    }

    const { apiKey, apiSecret } = ws.getCredentials()
    const { isPaper, dmsScope } = ws

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
  _startStrategyManager (server, ws) {
    let strategyManager = ws.getStrategyManager()
    if (strategyManager) {
      return
    }

    strategyManager = createStrategyManager(server, ws)
    ws.setStrategyManager(strategyManager)
  }
}

module.exports = new ConnectionManager()

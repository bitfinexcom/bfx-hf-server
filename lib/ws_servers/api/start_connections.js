'use strict'

const _isEqual = require('lodash/isEqual')

const { DEFAULT_USER } = require('../../constants')
const createClient = require('./open_auth_bitfinex_connection')
const createAlgoWorker = require('./factories/create_algo_worker')
const createDmsControl = require('./factories/create_dms_control')
const createFilteredWs = require('./factories/created_filtered_ws')
const createStrategyManager = require('./factories/create_strategy_manager')
const getUserSettings = require('../../util/user_settings')
const capture = require('../../capture')
const resendSnapshots = require('./snapshots/send_all')

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
   * @param {Session} session
   * @returns {Promise<void>}
   */
  async start (server, session) {
    if (this.isStartingServices) return
    this.isStartingServices = true

    try {
      const { mode } = session
      const currentCredentials = session.getCredentials()
      const prevCredentials = this.credentials[mode]
      const hasNewCredentials = !_isEqual(currentCredentials, prevCredentials)
      this.credentials[mode] = currentCredentials

      const wsForMode = createFilteredWs(session)

      await this._startDmsControl(server, session)
      await this._startAlgoWorker(server, session, wsForMode, hasNewCredentials)
      this._startStrategyManager(server, session, wsForMode)
      const hasNewClient = this._startBfxClient(server, session, wsForMode, hasNewCredentials)

      if (!hasNewClient) {
        await resendSnapshots(session, wsForMode)
      }
    } catch (err) {
      capture.exception(err)
    } finally {
      this.isStartingServices = false
    }
  }

  /**
   * @param {APIWSServer} server
   * @param {Session} session
   * @param {boolean} dms
   * @param {string} dmsScope
   * @returns {Promise<*>}
   */
  async updateDms (server, session, dms, dmsScope) {
    if (!dmsScope) {
      return
    }

    let dmsControl = session.getDmsControl()

    if (dmsControl && dmsControl.isOpen) {
      dmsControl.updateStatus(dms)
      return
    }

    if (!dms) {
      return
    }

    dmsControl = createDmsControl(server)
    session.setDmsControl(dmsControl)

    const { apiKey, apiSecret } = this.credentials[session.mode]
    return await dmsControl.open({
      apiKey,
      apiSecret,
      dmsScope
    })
  }

  /**
   * @param {APIWSServer} server
   * @param {Session} session
   * @returns {Promise<void>}
   * @private
   */
  async _startDmsControl (server, session) {
    const { db } = server
    const { dmsScope } = session
    const { dms } = await getUserSettings(db)
    await this.updateDms(server, session, dms, dmsScope)
  }

  /**
   * @param {APIWSServer} server
   * @param {Session} session
   * @param {FilteredWebSocket} ws
   * @param {boolean} shouldUpdate
   * @private
   */
  async _startAlgoWorker (server, session, ws, shouldUpdate = false) {
    let algoWorker = session.getAlgoWorker()
    if (algoWorker && algoWorker.isOpen && !shouldUpdate) {
      return
    }

    algoWorker = await createAlgoWorker(server, ws)
    session.setAlgoWorker(algoWorker)

    const { apiKey, apiSecret } = session.getCredentials()
    const userId = DEFAULT_USER
    await algoWorker.start({ apiKey, apiSecret, userId })
  }

  /**
   * @param {APIWSServer} server
   * @param {Session} session
   * @param {FilteredWebSocket} ws
   * @param {boolean} shouldUpdate
   * @private
   */
  _startBfxClient (server, session, ws, shouldUpdate = false) {
    const { d, wsURL, restURL } = server

    let client = session.getClient()
    if (client && client.isOpen && !shouldUpdate) {
      return false
    }

    const { apiKey, apiSecret } = session.getCredentials()
    const { isPaper, dmsScope } = session

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
    session.setClient(client)

    return true
  }

  /**
   * @param {APIWSServer} server
   * @param {Session} session
   * @param {FilteredWebSocket} ws
   * @private
   */
  _startStrategyManager (server, session, ws) {
    let strategyManager = session.getStrategyManager()
    if (strategyManager) {
      return
    }

    strategyManager = createStrategyManager(server, ws)
    session.setStrategyManager(strategyManager)
  }
}

module.exports = new ConnectionManager()

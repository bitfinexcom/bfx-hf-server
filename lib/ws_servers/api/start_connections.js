'use strict'

const _isEqual = require('lodash/isEqual')
const _isString = require('lodash/isString')

const { DEFAULT_USER } = require('../../constants')
const createClient = require('./open_auth_bitfinex_connection')
const createAlgoWorker = require('./factories/create_algo_worker')
const createDmsControl = require('./factories/create_dms_control')
const createFilteredWs = require('./factories/created_filtered_ws')
const createStrategyManager = require('./factories/create_strategy_manager')
const createMetricsClient = require('./factories/create_metrics_client')
const getUserSettings = require('../../util/user_settings')
const resendSnapshots = require('./snapshots/send_all')
const sendError = require('../../util/ws/send_error')
const send = require('../../util/ws/send')

class ConnectionManager {
  constructor () {
    this.debounce = { main: false, paper: false }
    this.credentials = {
      main: { apiKey: null, apiSecret: null },
      paper: { apiKey: null, apiSecret: null }
    }
  }

  /**
   * @param {APIWSServer} server
   * @param {Session} session
   * @returns {Promise<Error[]>}
   */
  async start (server, session) {
    const { mode } = session

    if (this.debounce[mode]) {
      return []
    }
    this.debounce[mode] = true

    const { hasNewCredentials } = this._updateCredentials(session)
    const wsForMode = createFilteredWs(session)

    const results = await Promise.allSettled([
      this._startDmsControl(server, session),
      this._startAlgoWorker(server, session, wsForMode, hasNewCredentials),
      this._startStrategyManager(server, session, wsForMode),
      this._startBfxClient(server, session, wsForMode, hasNewCredentials),
      this._startMetricsClient(server, session, wsForMode, hasNewCredentials)
    ])

    let status = {
      dmsControl: false,
      algoWorker: false,
      bfxClient: false,
      strategyManager: false,
      metricsClient: false
    }

    for (const { reason: err, value } of results) {
      if (err) {
        sendError(wsForMode, `Failed to start services: ${_isString(err) ? err : err.message}`)
      } else {
        status = { ...status, ...value }
      }
    }

    send(wsForMode, ['info.services.status', mode, status])
    this.debounce[mode] = false
  }

  /**
   * @param {Session} session
   * @returns {{hasNewCredentials: boolean}}
   */
  _updateCredentials (session) {
    const { mode } = session
    const currentCredentials = session.getCredentials()
    const prevCredentials = this.credentials[mode]

    const hasNewCredentials = !_isEqual(currentCredentials, prevCredentials)
    this.credentials[mode] = currentCredentials

    return { hasNewCredentials }
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
      return { dmsControl: false }
    }

    let dmsControl = session.getDmsControl()

    if (dmsControl && dmsControl.isOpen) {
      dmsControl.updateStatus(dms)
      return { dmsControl: dms }
    }

    if (!dms) {
      return { dmsControl: false }
    }

    dmsControl = createDmsControl(server)
    session.setDmsControl(dmsControl)

    const { apiKey, apiSecret } = this.credentials[session.mode]
    await dmsControl.open({
      apiKey,
      apiSecret,
      dmsScope
    })

    return { dmsControl: true }
  }

  /**
   * @param {APIWSServer} server
   * @param {Session} session
   * @param {FilteredWebSocket} ws
   * @param {boolean} shouldUpdate
   * @private
   */
  async _startMetricsClient (server, session, ws, shouldUpdate = false) {
    let metricsClient = session.getMetricsClient()
    if (!metricsClient) {
      metricsClient = createMetricsClient(server, session)
    }

    session.setMetricsClient(metricsClient)

    if (!metricsClient.isOpen) {
      await metricsClient.open()
    }

    if (metricsClient.isAuthenticated && !shouldUpdate) {
      metricsClient.sendAuidInfo()
      return { metricsClient: true }
    }

    const { dmsScope: scope } = session
    const { apiKey, apiSecret } = session.getCredentials()
    metricsClient.pub = send.bind(null, ws)

    metricsClient.auth({ apiKey, apiSecret, scope })
      .catch((err) => {
        server.d('failed to authenticate metrics server: %s', err.message)
      })

    return { metricsClient: true }
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
    return this.updateDms(server, session, dms, dmsScope)
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
      return { algoWorker: true }
    }

    algoWorker = await createAlgoWorker(server, session, ws)
    session.setAlgoWorker(algoWorker)

    const { apiKey, apiSecret } = session.getCredentials()
    const userId = DEFAULT_USER
    await algoWorker.start({ apiKey, apiSecret, userId })
    return { algoWorker: true }
  }

  /**
   * @param {APIWSServer} server
   * @param {Session} session
   * @param {FilteredWebSocket} ws
   * @param {boolean} shouldUpdate
   * @private
   */
  async _startBfxClient (server, session, ws, shouldUpdate = false) {
    const { d, wsURL, restURL, algoDB } = server

    let client = session.getClient()
    if (client && client.isOpen && !shouldUpdate) {
      resendSnapshots(session, ws)
      return { bfxClient: true }
    }

    const { apiKey, apiSecret } = session.getCredentials()
    const { isPaper, dmsScope, sendDataToMetricsServer, mode } = session

    client = createClient({
      apiKey,
      apiSecret,
      d,
      wsURL,
      restURL,
      isPaper,
      dmsScope,
      ws,
      dms: false,
      sendDataToMetricsServer,
      mode,
      session,
      algoDB
    })
    session.setClient(client)

    return { bfxClient: true }
  }

  /**
   * @param {APIWSServer} server
   * @param {Session} session
   * @param {FilteredWebSocket} ws
   * @private
   */
  async _startStrategyManager (server, session, ws) {
    let strategyManager = session.getStrategyManager()
    if (strategyManager) {
      return { strategyManager: true }
    }

    const { dmsScope: scope = 'app', sendDataToMetricsServer } = session

    strategyManager = createStrategyManager(server, session, ws, scope, sendDataToMetricsServer)
    session.setStrategyManager(strategyManager)

    return { strategyManager: true }
  }
}

module.exports = new ConnectionManager()

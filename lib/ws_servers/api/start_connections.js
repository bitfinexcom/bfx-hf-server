'use strict'

const _isEqual = require('lodash/isEqual')
const _isString = require('lodash/isString')

const { DEFAULT_USER } = require('../../constants')
const createClient = require('./open_auth_bitfinex_connection')
const createAlgoWorker = require('./factories/create_algo_worker')
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
    const { db } = server
    const { mode } = session

    if (this.debounce[mode]) {
      return []
    }
    this.debounce[mode] = true

    const { hasNewCredentials } = this._updateCredentials(session)
    const wsForMode = createFilteredWs(session)
    const settings = await getUserSettings(db)

    const results = await Promise.allSettled([
      this._startAlgoWorker(server, session, wsForMode, settings, hasNewCredentials),
      this._startStrategyManager(server, session, wsForMode, settings),
      this._startBfxClient(server, session, wsForMode, settings, hasNewCredentials)
    ])

    let status = {
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
   * @param {FilteredWebSocket} ws
   * @param {Object} settings
   * @param {boolean} shouldUpdate
   * @private
   */
  async _startAlgoWorker (server, session, ws, settings, shouldUpdate = false) {
    let algoWorker = session.getAlgoWorker()
    if (algoWorker && algoWorker.isOpen && !shouldUpdate) {
      return { algoWorker: true }
    }

    algoWorker = createAlgoWorker(server, session, ws, settings)
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
   * @param {Object} settings
   * @param {boolean} shouldUpdate
   * @private
   */
  async _startBfxClient (server, session, ws, settings, shouldUpdate = false) {
    const { d, wsURL, restURL, algoDB } = server

    let client = session.getClient()
    if (client && client.isOpen && !shouldUpdate) {
      resendSnapshots(session, ws)
      return { bfxClient: true }
    }

    const { apiKey, apiSecret } = session.getCredentials()
    const { isPaper, dmsScope, sendDataToMetricsServer, mode } = session
    const { packetWDDelay } = settings

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
      algoDB,
      packetWDDelay
    })
    session.setClient(client)

    return { bfxClient: true }
  }

  /**
   * @param {APIWSServer} server
   * @param {Session} session
   * @param {FilteredWebSocket} ws
   * @param {Object} settings
   * @private
   */
  async _startStrategyManager (server, session, ws, settings) {
    let strategyManager = session.getStrategyManager()
    if (strategyManager) {
      return { strategyManager: true }
    }

    const { dmsScope: scope = 'app', sendDataToMetricsServer } = session

    strategyManager = await createStrategyManager(server, session, ws, scope, settings, sendDataToMetricsServer)
    session.setStrategyManager(strategyManager)

    return { strategyManager: true }
  }
}

module.exports = new ConnectionManager()

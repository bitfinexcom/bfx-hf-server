'use strict'

const { DEFAULT_USER } = require('../../constants')

const openAuthBitfinexConnection = require('./open_auth_bitfinex_connection')
const getUserSettings = require('../../util/user_settings')
const capture = require('../../capture')
const AlgoWorker = require('./algos/algo_worker')
const send = require('../../util/ws/send')
const DmsRemoteControl = require('./dms_remote_control')
const StrategyManager = require('./handlers/strategy/strategy_manager')

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

    const { hostedURL, restURL } = server
    dmsControl = new DmsRemoteControl({ hostedURL, restURL })
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

    algoWorker = await this._createAlgoWorker(server, ws)
    ws.setAlgoWorker(algoWorker)

    await algoWorker.start({ apiKey, apiSecret, userId })
  }

  /**
   * @private
   */
  _startBfxClient ({ ws, d, apiKey, apiSecret, wsURL, restURL, mode, isPaper }, shouldUpdate = false) {
    let client = ws.getClient()
    if (client && client.isOpen && !shouldUpdate) {
      return
    }

    client = openAuthBitfinexConnection({
      ws,
      d,
      dms: false,
      apiKey,
      apiSecret,
      wsURL,
      restURL,
      isPaper
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

    const { wsURL, restURL, strategyExecutionDB } = server
    const bcast = { ws: send.bind(send, ws) }

    strategyManager = new StrategyManager(
      {
        dms: false,
        wsURL,
        restURL
      },
      bcast,
      strategyExecutionDB
    )
    ws.setStrategyManager(strategyManager)
  }

  /**
   * @param {APIWSServer} server
   * @param {Session} ws
   * @returns {Promise<AlgoWorker>}
   */
  async _createAlgoWorker (server, ws) {
    const {
      tracerDir,
      wsURL,
      restURL,
      algos,
      algoDB,
      logAlgoOpts,
      marketData
    } = server
    const bcast = { ws: send.bind(send, ws) }
    const { affiliateCode } = await server.getUserSettings()

    return new AlgoWorker(
      {
        dms: false,
        affiliateCode,
        wsURL,
        restURL,
        signalTracerOpts: {
          enabled: true,
          dir: tracerDir
        }
      },
      algos,
      bcast,
      algoDB,
      logAlgoOpts,
      marketData
    )
  }
}

module.exports = new ConnectionManager()

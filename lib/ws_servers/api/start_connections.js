'use strict'

const { DEFAULT_USER } = require('../../constants')

const openAuthBitfinexConnection = require('./open_auth_bitfinex_connection')
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
    } catch (err) {
      capture.exception(err)
    } finally {
      this.starting = false
    }
  }

  /**
   * @param ws
   * @param {boolean} dms
   * @returns {Promise<*>}
   */
  async updateDms (ws, dms) {
    if (!this.scope) {
      return
    }
    if (ws.dmsControl.isOpen) {
      ws.dmsControl.updateStatus(dms)
      return
    }
    if (dms) {
      const { apiKey, apiSecret } = this._getCredentials()
      return await ws.dmsControl.open({
        apiKey,
        apiSecret,
        scope: this.scope
      })
    }
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
   * @param ws
   * @param db
   * @returns {Promise<void>}
   * @private
   */
  async _startDmsControl ({ ws, db }) {
    const { dms } = await getUserSettings(db)
    await this.updateDms(ws, dms)
  }

  /**
   * @private
   */
  async _startAlgoWorker ({ server, ws, apiKey, apiSecret, mode, userId = DEFAULT_USER }, shouldUpdate = false) {
    let algoWorker = ws.workers[mode]
    if (algoWorker && algoWorker.isOpen && !shouldUpdate) {
      ws.algoWorker = algoWorker
      return
    }

    algoWorker = await server.createAlgoWorker(ws)
    ws.algoWorker = algoWorker
    ws.workers[mode] = algoWorker

    await algoWorker.start({ apiKey, apiSecret, userId })
  }

  /**
   * @private
   */
  _startBfxClient ({ ws, d, apiKey, apiSecret, wsURL, restURL, mode, isPaper }, shouldUpdate = false) {
    let client = ws.clients[mode]
    if (client && client.isOpen && !shouldUpdate) {
      ws.clients.bitfinex = client
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
    ws.clients[mode] = client
    ws.clients.bitfinex = client
  }
}

module.exports = new ConnectionManager()

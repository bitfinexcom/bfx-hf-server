'use strict'

const { DEFAULT_USER } = require('../../constants')

const openAuthBitfinexConnection = require('./open_auth_bitfinex_connection')
const getUserSettings = require('../../util/user_settings')
const capture = require('../../capture')

class ConnectionManager {
  constructor () {
    this.apiKey = null
    this.apiSecret = null
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
      const { ws, apiKey, apiSecret, dmsScope } = args
      const newCredentials = apiKey !== this.apiKey || apiSecret !== this.apiSecret
      const hasClients = ws.algoWorker.isOpen && ws.clients.bitfinex && ws.clients.bitfinex.isOpen

      this.apiKey = args.apiKey
      this.apiSecret = args.apiSecret
      this.scope = dmsScope

      await this._startDmsControl(args)

      if (newCredentials || !hasClients) {
        await this._startAlgoWorker(args, newCredentials)
        this._startBfxClient(args, newCredentials)
      }
    } catch (err) {
      capture.exception(err)
    } finally {
      this.starting = false
    }
  }

  async updateDms (ws, dms) {
    if (!this.scope) {
      return
    }
    if (ws.dmsControl.isOpen) {
      ws.dmsControl.updateStatus(dms)
    } else if (dms) {
      await ws.dmsControl.open({
        apiKey: this.apiKey,
        apiSecret: this.apiSecret,
        scope: this.scope
      })
    }
  }

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
    if (client && !shouldUpdate) {
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

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
   * @param args.ws
   * @param args.db
   * @param args.d
   * @param args.apiKey
   * @param args.apiSecret
   * @param args.wsURL
   * @param args.restURL
   * @param args.dmsScope
   * @returns {Promise<void>}
   */
  async start (args) {
    try {
      if (this.starting) return
      this.starting = true

      const { ws, apiKey, apiSecret, dmsScope } = args
      const newCredentials = apiKey !== this.apiKey || apiSecret !== this.apiSecret
      const hasClients = ws.algoWorker.isOpen && ws.clients.bitfinex && ws.clients.bitfinex.isOpen

      this.apiKey = args.apiKey
      this.apiSecret = args.apiSecret
      this.scope = dmsScope

      await this._startDmsControl(args)

      if (!newCredentials && hasClients) {
        this.starting = false
        return
      }

      await this._startAlgoWorker(args)
      this._startBfxClient(args)
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
   * @returns {Promise<void>}
   */
  _startAlgoWorker ({ ws, apiKey, apiSecret }) {
    return ws.algoWorker.start({
      apiKey,
      apiSecret,
      userId: DEFAULT_USER
    })
  }

  /**
   * @private
   */
  _startBfxClient ({ ws, d, apiKey, apiSecret, wsURL, restURL }) {
    ws.clients.bitfinex = openAuthBitfinexConnection({
      ws,
      d,
      dms: false,
      apiKey,
      apiSecret,
      wsURL,
      restURL
    })
  }
}

module.exports = new ConnectionManager()

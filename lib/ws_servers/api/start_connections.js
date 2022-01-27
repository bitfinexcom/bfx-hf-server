'use strict'

const { DEFAULT_USER } = require('../../constants')

const DmsRemoteControl = require('./dms_remote_control')
const openAuthBitfinexConnection = require('./open_auth_bitfinex_connection')
const getUserSettings = require('../../util/user_settings')

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
   * @param args.hostedURL
   * @param args.dmsScope
   * @returns {Promise<void>}
   */
  async start (args) {
    if (this.starting) return
    this.starting = true

    await this._startDmsControl(args)

    const { ws, apiKey, apiSecret } = args
    const newCredentials = apiKey !== this.apiKey && apiSecret !== this.apiSecret
    const hasClients = ws.algoWorker && ws.clients.bitfinex
    if (!newCredentials && hasClients) {
      this.starting = false
      return
    }

    await this._startAlgoWorker(args)
    console.log('@@ aw started')
    this._startBfxClient(args)
    console.log('@@ bfx started')

    this.apiKey = args.apiKey
    this.apiSecret = args.apiSecret
    this.starting = false
  }

  async _startDmsControl ({ ws, db, dmsScope, hostedURL, restURL, apiKey, apiSecret }) {
    if (!dmsScope) {
      return
    }

    const { dms } = await getUserSettings(db)
    if (ws.dmsControl) {
      ws.dmsControl.updateStatus(dms)
      return
    }

    ws.dmsControl = new DmsRemoteControl({
      hostedURL,
      restURL,
      apiKey,
      apiSecret,
      dmsScope
    })
    await ws.dmsControl.open()
    console.log('@@ dms started')
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

'use strict'

const WebSocket = require('ws')
const flatPromise = require('flat-promise')
const { RESTv2 } = require('bfx-api-node-rest')

const maxWaitTime = 2 * 1000
const pingInterval = 20 * 1000

const DEFAULT_HOSTED_WS_URL = 'wss://bfx-hf-ui-core.bitfinex.com/ws/'

class DmsRemoteControl {
  /**
   * @param {string} hostedURL
   * @param {string} restURL
   * @param {string} apiKey
   * @param {string} apiSecret
   */
  constructor ({ hostedURL, restURL, apiKey, apiSecret }) {
    this.hostedURL = hostedURL || DEFAULT_HOSTED_WS_URL
    this.restURL = restURL
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    this.ws = null
  }

  /**
   * @param {string} scope
   * @returns {Promise<void>}
   */
  async open (scope) {
    const token = await this._getAuthToken()
    return this._connectToWs(token, scope)
  }

  close () {
    this.stopped = true

    if (this.interval) {
      clearInterval(this.interval)
    }
    if (this.ws) {
      this.ws.close()
    }
  }

  async _getAuthToken () {
    const client = new RESTv2({
      transform: true,
      url: this.restURL,
      apiKey: this.apiKey,
      apiSecret: this.apiSecret
    })
    const [token] = await client.generateToken({
      scope: 'api',
      writePermission: false,
      ttl: 60 * 60,
      caps: ['o']
    })
    return token
  }

  _connectToWs (token, scope) {
    let timeout
    const { promise, resolve, reject } = flatPromise()
    const authMessage = {
      event: 'auth',
      token,
      dms: true,
      dmsScope: scope,
      noInteraction: true
    }

    this.ws = new WebSocket(this.hostedURL)
    this.ws.once('open', () => {
      this._send(authMessage)
      timeout = setTimeout(() => reject('auth timeout'), maxWaitTime)
    })
    this.ws.once('error', reject)
    this.ws.once('message', (raw) => {
      const msg = JSON.parse(raw)

      if (Array.isArray(msg) && msg[0] === 'auth.user_id') {
        clearTimeout(timeout)
        this._schedulePing()
        resolve()
      }
    })
    this.ws.once('close', () => {
      if (!this.stopped) {
        this.open(scope)
      }
    })

    return promise
  }

  _send (msg) {
    this.ws.send(JSON.stringify(msg))
  }

  _schedulePing () {
    const ping = () => this._send({ event: 'ping' })
    this.interval = setInterval(ping, pingInterval)
  }
}

module.exports = DmsRemoteControl

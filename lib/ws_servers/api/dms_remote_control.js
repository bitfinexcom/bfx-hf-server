'use strict'

const WebSocket = require('ws')
const flatPromise = require('flat-promise')
const { RESTv2 } = require('bfx-api-node-rest')

const maxWaitTime = 2 * 1000
const pingInterval = 20 * 1000
const delayReconnect = 1000

const DEFAULT_HOSTED_WS_URL = 'wss://bfx-hf-ui-core.bitfinex.com/ws/'

class DmsRemoteControl {
  /**
   * @param {string} hostedURL
   * @param {string} restURL
   * @param {string} apiKey
   * @param {string} apiSecret
   * @param {string} dmsScope
   */
  constructor ({ hostedURL, restURL, apiKey, apiSecret, dmsScope }) {
    this.hostedURL = hostedURL || DEFAULT_HOSTED_WS_URL
    this.restURL = restURL
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    this.scope = dmsScope
    this.ws = null
  }

  async open () {
    const token = await this._getAuthToken()
    return this._connectToWs(token)
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

  _connectToWs (token) {
    const { promise, resolve, reject } = flatPromise()
    const onTimeout = () => reject('auth timeout')

    this.ws = new WebSocket(this.hostedURL)
    this.ws.once('open', this._onOpen.bind(this, token, onTimeout))
    this.ws.once('error', reject)
    this.ws.once('message', this._onMessage.bind(this, resolve))
    this.ws.once('close', this._onClose.bind(this))

    return promise
  }

  _send (msg) {
    this.ws.send(JSON.stringify(msg))
  }

  _schedulePing () {
    const ping = () => this._send({ event: 'ping' })
    this.interval = setInterval(ping, pingInterval)
  }

  _onOpen (token, onTimeout) {
    this._send({
      event: 'auth',
      token,
      dms: true,
      dmsScope: this.scope,
      noInteraction: true
    })
    this.authTimeout = setTimeout(onTimeout, maxWaitTime)
  }

  _onMessage (onSuccess, raw) {
    const msg = JSON.parse(raw)

    if (Array.isArray(msg) && msg[0] === 'auth.user_id') {
      clearTimeout(this.authTimeout)
      this._schedulePing()
      onSuccess()
    }
  }

  _onClose () {
    if (this.stopped) return
    setTimeout(() => this.open(), delayReconnect)
  }
}

module.exports = DmsRemoteControl

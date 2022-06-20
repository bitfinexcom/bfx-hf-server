'use strict'

const WebSocket = require('ws')
const flatPromise = require('flat-promise')
const { RESTv2 } = require('bfx-api-node-rest')

const maxWaitTime = 2 * 1000
const pingInterval = 20 * 1000
const delayReconnect = 1000
const tokenTTL = 60 * 60

const DEFAULT_HOSTED_WS_URL = 'wss://h.bitfinex.com/ws/'

class DmsRemoteControl {
  /**
   * @param {string} hostedURL
   * @param {string} restURL
   */
  constructor ({ hostedURL, restURL }) {
    this.hostedURL = hostedURL || DEFAULT_HOSTED_WS_URL
    this.restURL = restURL
    this.ws = null
    this.isOpen = false
  }

  async open ({ apiKey, apiSecret, dmsScope }) {
    this.scope = dmsScope
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    this.isOpen = true

    const token = await this._getAuthToken()
    return this._connectToWs(token)
  }

  /**
   * @param {boolean} active
   */
  updateStatus (active) {
    if (active) {
      return
    }
    this._disable()
    this.close()
  }

  close () {
    this.isOpen = false

    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }
    if (this.ws) {
      this.ws.close()
    }
  }

  async _getAuthToken () {
    if (this.authToken && Date.now() < this.tokenExpiresAt) {
      return this.authToken
    }

    const rest = this._getRestClient()
    const [token] = await rest.generateToken({
      scope: 'api',
      writePermission: true,
      ttl: tokenTTL,
      caps: ['o']
    })

    this.authToken = token
    this.tokenExpiresAt = Date.now() + (tokenTTL * 1000)

    return token
  }

  _connectToWs (token) {
    const { promise, resolve, reject } = flatPromise()
    const onTimeout = () => reject('auth timeout')
    const onError = () => reject('failed to connect to remote DMS')

    this.ws = new WebSocket(this.hostedURL)
    this.ws.once('open', this._onOpen.bind(this, token, onTimeout))
    this.ws.once('error', onError)
    this.ws.once('message', this._onMessage.bind(this, resolve))
    this.ws.once('close', this._onClose.bind(this))

    return promise
  }

  _send (msg) {
    if (this.ws) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  _schedulePing () {
    const ping = () => this._send({ event: 'ping' })
    this.pingInterval = setInterval(ping, pingInterval)
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
    if (!this.isOpen) return
    const args = {
      apiKey: this.apiKey,
      apiSecret: this.apiSecret,
      dmsScope: this.scope
    }
    setTimeout(() => this.open(args), delayReconnect)
  }

  _disable () {
    this._send({
      event: 'disable_dms',
      scope: this.scope
    })
  }

  _getRestClient () {
    return new RESTv2({
      transform: true,
      url: this.restURL,
      apiKey: this.apiKey,
      apiSecret: this.apiSecret
    })
  }
}

module.exports = DmsRemoteControl

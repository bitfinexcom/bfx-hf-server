'use strict'

const WebSocket = require('ws')
const flatPromise = require('flat-promise')
const { RESTv2 } = require('bfx-api-node-rest')
const debug = require('debug')('bfx:hf:server:metrics-client')

const pingInterval = 20 * 1000
const delayReconnect = 10000
const tokenTTL = 60 * 60

class MetricsClient {
  constructor ({ metricsServerURL, restURL, os, releaseVersion, isRC, sessionId }) {
    if (!metricsServerURL) {
      throw new Error('Invalid metrics server url')
    }
    this.metricsServerURL = metricsServerURL
    this.restURL = restURL
    this.os = os
    this.releaseVersion = releaseVersion
    this.isRC = isRC
    this.sessionId = sessionId

    this.pub = null
    this.isOpen = false
    this.auidInfo = null
    this.isAuthenticated = false

    this.pendingMessages = []
  }

  sendAuidInfo () {
    if (this.auidInfo) {
      this.pub(this.auidInfo)
    }
  }

  async auth ({ apiKey, apiSecret, scope }) {
    this.scope = scope
    this.apiKey = apiKey
    this.apiSecret = apiSecret

    await this._authenticate()
    this.isAuthenticated = true
  }

  close () {
    this.isOpen = false
    this.isAuthenticated = false

    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }
    if (this.ws) {
      this.ws.close()
    }
    this.ws = null
  }

  async _getAuthToken () {
    if (this.authToken && Date.now() < this.tokenExpiresAt) {
      return this.authToken
    }

    try {
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
    } catch (err) {
      debug('error generating token: Err- %s', err.stack)
      return null
    }
  }

  open () {
    if (this.ws) return

    const { promise, resolve, reject } = flatPromise()
    const onError = () => reject('failed to connect to metrics server')

    this.ws = new WebSocket(this.metricsServerURL)
    this.ws.once('open', this._onOpen.bind(this, resolve))
    this.ws.once('error', onError)
    this.ws.on('message', this._onMessage.bind(this))
    this.ws.once('close', this._onClose.bind(this))

    return promise
  }

  send (msg) {
    if (!this.isOpen || !this.ws) {
      this.pendingMessages.push(msg)
      return
    }

    while (this.pendingMessages.length > 0) {
      this._send(this.pendingMessages.shift())
    }

    this._send(msg)
  }

  _send (msg) {
    this.ws.send(JSON.stringify(msg))
  }

  _schedulePing () {
    const ping = () => this.send({ event: 'ping' })
    this.pingInterval = setInterval(ping, pingInterval)
  }

  async _onOpen (onSuccess) {
    this.isOpen = true
    this._schedulePing()
    this._sendInitialSessionData()
    onSuccess()
  }

  _sendInitialSessionData () {
    const { sessionId, os, releaseVersion, isRC } = this
    this.send({
      event: 'save_session',
      sessionId,
      os,
      releaseVersion,
      isRC
    })
  }

  async _authenticate () {
    const token = await this._getAuthToken()
    if (token) {
      this.send({
        event: 'auth',
        token,
        scope: this.scope
      })
    }
  }

  _onMessage (raw) {
    const msg = JSON.parse(raw)

    if (this.pub && Array.isArray(msg) && msg[0] === 'info.auid') {
      this.auidInfo = msg
      this.sendAuidInfo()
    }
  }

  _onClose () {
    if (!this.isOpen) return
    const args = {
      apiKey: this.apiKey,
      apiSecret: this.apiSecret,
      scope: this.scope
    }
    setTimeout(() => this.open(args), delayReconnect)
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

module.exports = MetricsClient

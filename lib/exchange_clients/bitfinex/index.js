'use strict'

const { Manager, submitOrder, updateOrder, cancelOrder, cancelOrdersByGid } = require('bfx-api-node-core')
const { RESTv2 } = require('bfx-api-node-rest')
const Watchdog = require('bfx-api-node-plugin-wd')
const debug = require('debug')('bfx:hf:server:exchange-clients:bitfinex')

const recvMessage = require('./recv/message')
const getMarkets = require('./get_markets')
const capture = require('../../capture')

const { DMS_ENABLED, WD_RECONNECT_DELAY, WD_PACKET_DELAY } = require('../../constants')

class BitfinexExchangeConnection {
  constructor ({ wsURL, restURL, packetWDDelay = WD_PACKET_DELAY }) {
    this.wsURL = wsURL
    this.restURL = restURL
    this.packetWDDelay = packetWDDelay
    this.d = debug
    this.ws = null
    this.rest = new RESTv2({ url: restURL, transform: true })
    this.dataListeners = []
    this.authArgs = {}
  }

  setDMS (dms) {
    this.setAuthArgs({
      dms: dms ? DMS_ENABLED : 0
    })
  }

  setAuthArgs (args) {
    this.authArgs = {
      ...this.authArgs,
      ...args
    }

    const { calc, dms, apiKey, apiSecret, authToken } = this.authArgs

    if (this.ws) {
      if (calc) this.ws.calc = calc
      if (dms) this.ws.dms = dms
      if (apiKey) this.ws.apiKey = apiKey
      if (apiSecret) this.ws.apiSecret = apiSecret
      if (authToken) this.ws.authToken = authToken
    }

    this.rest = new RESTv2({
      transform: true,
      url: this.restURL,
      apiKey,
      apiSecret,
      authToken
    })
  }

  reconnect () {
    this.ws.reconnectAllSockets()
  }

  openWS (args = {}) {
    const opts = {
      wsURL: this.wsURL,
      ...args
    }

    this.isOpen = true
    this.ws = new Manager({
      ...opts,
      plugins: [
        Watchdog({
          reconnectDelay: WD_RECONNECT_DELAY,
          packetWDDelay: this.packetWDDelay
        })
      ],
      transform: true
    })
    this.ws.on('ws2:message', (msg) => recvMessage(this, msg))
    this.ws.on('ws2:error', this.onWSError.bind(this))
  }

  openSocket () {
    if (this.ws) {
      this.ws.openWS()
    } else {
      debug('ws not initialized, cannot open socket')
    }
  }

  close () {
    this.isOpen = false
    if (this.ws) {
      this.ws.closeAllSockets()
    } else {
      debug('ws not initialized, cannot close sockets')
    }
  }

  on (event, handler) {
    if (this.ws) {
      this.ws.on(event, handler)
    } else {
      debug('ws not initialized, cannot assign event handler')
    }
  }

  onData (cb) {
    this.dataListeners.push(cb)
  }

  async submitOrder (packet) {
    const state = this.ws.getWSByIndex(0)
    return submitOrder(state, packet)
  }

  async updateOrder (packet) {
    const state = this.ws.getWSByIndex(0)
    return updateOrder(state, packet)
  }

  async cancelOrder (id) {
    const state = this.ws.getWSByIndex(0)
    return cancelOrder(state, id)
  }

  async cancelOrdersByGid (gid) {
    const state = this.ws.getWSByIndex(0)
    return cancelOrdersByGid(state, { gid })
  }

  onWSError (err) {
    debug('error: %s', err.message)
  }

  getMarkets () {
    return getMarkets(this.rest)
  }

  async getUserInfo () {
    let retry = 0
    let err = null

    while (retry < 3) {
      try {
        return await this.rest.userInfo()
      } catch (e) {
        err = e
        retry++
      }
    }
    if (err) capture.exception(err)
    return null
  }
}

BitfinexExchangeConnection.id = 'bitfinex'

module.exports = BitfinexExchangeConnection

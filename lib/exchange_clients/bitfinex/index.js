'use strict'

const { WS2Manager } = require('bitfinex-api-node')
const { RESTv2 } = require('bfx-api-node-rest')
const debug = require('debug')('bfx:hf:server:exchange-clients:bitfinex')

const chanDataToKey = require('../../util/chan_data_to_key')

const orderTransformer = require('./transformers/order')
const balanceTransformer = require('./transformers/balance')

const recvMessage = require('./recv/message')
const getMarkets = require('./get_markets')
const unsubscribe = require('./unsubscribe')
const subscribe = require('./subscribe')

class BitfinexExchangeConnection {
  constructor (opts) {
    const { wsURL, restURL } = opts

    this.wsURL = wsURL
    this.d = debug
    this.ws = null
    this.rest = new RESTv2({ url: restURL })
    this.channelMap = {}
    this.subs = {} // { [cdKey]: chanId }
    this.pendingSubs = {} //
    this.dataListeners = []
    this.authArgs = {}
  }

  setDMS (dms) {
    this.setAuthArgs({
      dms: dms ? 4 : 0
    })
  }

  setAuthArgs (args) {
    this.authArgs = {
      ...this.authArgs,
      ...args
    }

    if (this.ws) {
      this.ws.setAuthArgs(this.authArgs)
    }
  }

  reconnect () {
    this.ws.reconnect()
  }

  openWS (args = {}) {
    const opts = {
      url: this.wsURL,
      autoReconnect: true,
      reconnectDelay: 10 * 1000,
      ...args
    }

    this.ws = new WS2Manager(opts, this.authArgs)
    this.ws.on('message', (msg) => recvMessage(this, msg))
    this.ws.on('error', this.onWSError.bind(this))
    this.ws.on('auth', this.onWSAuth.bind(this))
  }

  onWSAuth () {
    this.channelMap['0'] = { channel: 'auth' }
  }

  openSocket () {
    if (this.ws) {
      this.ws.openSocket()
    } else {
      debug('ws not initialized, cannot open socket')
    }
  }

  close () {
    if (this.ws) {
      this.ws.close()
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
    const socket = this.ws.getAuthenticatedSocket()
    return socket.ws.submitOrder(packet)
  }

  async cancelOrder (id) {
    const socket = this.ws.getAuthenticatedSocket()
    return socket.ws.cancelOrder(id)
  }

  async submitOrderMultiOp (opPayloads) {
    const socket = this.ws.getAuthenticatedSocket()
    return socket.ws.submitOrderMultiOp(opPayloads)
  }

  onWSError (err) {
    debug('error: %s', err.message)
  }

  async subscribe (channelData) {
    return subscribe(this, channelData)
  }

  unsubscribe (channelData) {
    return unsubscribe(this, channelData)
  }

  isSubscribed (channelData) {
    return !!this.getChannelID(channelData)
  }

  getChannelID (channelData) {
    const cdKey = chanDataToKey(channelData)
    return this.subs[cdKey]
  }

  getChannelData (chanID) {
    return this.channelMap[`${chanID}`]
  }

  getMarkets () {
    return getMarkets(this.rest)
  }

  static transformBalance (balance) {
    return balanceTransformer(balance)
  }

  static transformBalances (balances) {
    return balances.map(balanceTransformer)
  }

  static transformOrder (order) {
    return orderTransformer(order)
  }

  static transformOrders (orders) {
    return orders.map(orderTransformer)
  }
}

BitfinexExchangeConnection.id = 'bitfinex'

module.exports = BitfinexExchangeConnection

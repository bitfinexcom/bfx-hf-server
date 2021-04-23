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

// TODO fix typo
class BitfinexEchangeConnection {
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
    this.books = {}
    this.lastBookPacketSent = {}
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

  openWS (args = {}) {
    const opts = {
      url: this.wsURL,
      ...args
    }

    this.ws = new WS2Manager(opts, this.authArgs)
    this.ws.on('message', this.onWSMessage.bind(this))
    this.ws.on('error', this.onWSError.bind(this))
    this.ws.on('auth', this.onWSAuth.bind(this))
    this.ws.on('close', this.onWSClose.bind(this))
    this.ws.on('open', this.onWSOpen.bind(this))

    this.reconnectTimeout = null
    this.sendHeartbeatTimeout = null
    this.pongReceived = true
  }

  scheduleReconnect () {
    this.reconnectTimeout = setTimeout(() => {
      this.reconnect()
    }, 10000)
  }

  sendHeartbeat () {
    clearTimeout(this.sendHeartbeatTimeout)

    this.sendHeartbeatTimeout = setTimeout(() => {
      if (!this.pongReceived) {
        this.scheduleReconnect()
        return
      }
      const socket = this.ws._sockets[0]
      if (socket.ws._isOpen && !socket.ws._isClosing) {
        this.pongReceived = false
        socket.ws.send({ event: 'ping' })
      }

      this.sendHeartbeat()
    }, 5000)
  }

  reconnect () {
    this.ws.reconnect()
  }

  async onWSOpen () {
    this.pongReceived = true
    this.sendHeartbeat()
  }

  onWSClose () {
    clearTimeout(this.sendHeartbeatTimeout)
  }

  onWSMessage (msg) {
    clearTimeout(this.reconnectTimeout)
    if (msg.event && msg.event === 'pong') {
      this.pongReceived = true
    }
    recvMessage(this, msg)
  }

  onWSAuth () {
    this.channelMap['0'] = { channel: 'auth' }
  }

  openSocket () {
    if (!this.ws) {
      return
    }
    this.ws.openSocket()
  }

  close () {
    clearTimeout(this.sendHeartbeatTimeout)
    if (!this.ws) {
      return
    }
    this.ws.close()
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

BitfinexEchangeConnection.id = 'bitfinex'

module.exports = BitfinexEchangeConnection

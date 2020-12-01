'use strict'

const _isFunction = require('lodash/isFunction')
const { WS2Manager } = require('bitfinex-api-node')
const { RESTv2 } = require('bfx-api-node-rest')
const debug = require('debug')('bfx:hf:server:exchange-clients:bitfinex')

const chanDataToKey = require('../../util/chan_data_to_key')

const orderTransformer = require('./transformers/order')
const balanceTransformer = require('./transformers/balance')
const candleTransformer = require('./transformers/candle')

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
    this.firstConnect = true
  }

  scheduleReconnect () {
    this.reconnectTimeout = setTimeout(() => {
      this.reconnect()
    }, 10000)
  }

  sendHeartbeat () {
    clearTimeout(this.sendHeartbeatTimeout)

    this.sendHeartbeatTimeout = setTimeout(() => {
      const socket = this.ws._sockets[0]
      if (socket.ws._isOpen && !socket.ws._isClosing) {
        socket.ws.send({ event: 'ping' })
      }

      this.sendHeartbeat()
    }, 5000)
  }

  reconnect () {
    this.ws.reconnect()
  }

  async onWSOpen () {
    this.scheduleReconnect()
    this.sendHeartbeat()

    if (this.firstConnect === false) {
      this.resubscribe()
    }

    this.firstConnect = false
  }

  async resubscribe () {
    if (!this.subscriptions) return
    if (!this.subscriptions.length) return

    const unsubs = []
    for (const data of this.subscriptions) {
      await this.unsubscribe(data)
      unsubs.push(data)
    }

    for (const data of unsubs) {
      this.subscribe(data)
    }
  }

  onWSClose () {}

  onWSMessage (msg) {
    clearTimeout(this.reconnectTimeout)
    this.scheduleReconnect()

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
    this.scheduleReconnect()
  }

  async close () {
    if (!this.ws) {
      return
    }

    try {
      await this.ws.close()
    } catch (e) {}
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
    return getMarkets()
  }

  static getCandleTimeFrames () {
    return [
      '1m', '5m', '15m', '30m', '1h', '3h', '6h', '12h', '1D', '7D', '14D', '1M'
    ]
  }

  static transformCandle (candle) {
    return candleTransformer(candle)
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

  static async registerUIDefs (algoOrders, rest) {
    const timeframes = BitfinexExchangeConnection.getCandleTimeFrames()
    const aoUIDefs = algoOrders.filter((ao) => {
      const { meta = {} } = ao
      const { getUIDef } = meta

      return _isFunction(getUIDef)
    }).map((ao) => {
      const { meta = {} } = ao
      const { getUIDef } = meta
      const { id } = ao

      return {
        id,
        uiDef: getUIDef({ timeframes })
      }
    })

    const AO_SETTINGS_KEY = 'api:bitfinex_algorithmic_orders'

    debug(
      'overwriting algo order UI definition user settings (key %s)',
      AO_SETTINGS_KEY
    )

    const res = await rest.getSettings([AO_SETTINGS_KEY])
    const [keyResult = []] = res
    const [, aoSettings = {}] = keyResult

    aoUIDefs.forEach(({ id, uiDef }) => {
      debug('setting UI def for %s', id)
      aoSettings[id] = uiDef
    })

    await rest.updateSettings({ [AO_SETTINGS_KEY]: aoSettings })

    debug('all UIs registered!')
  }
}

BitfinexExchangeConnection.id = 'bitfinex'

module.exports = BitfinexExchangeConnection

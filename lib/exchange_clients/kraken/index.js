'use strict'

const WS = require('ws')
const _last = require('lodash/last')
const Promise = require('bluebird')
const kraken = require('node-kraken-api')
const debug = require('debug')('bfx:hf:server:exchange-clients:kraken')

const chanDataToKey = require('../../util/chan_data_to_key')
const nonce = require('../../util/nonce')

const bookTransformer = require('./transformers/book')
const candleTransformer = require('./transformers/candle')
const tickerTransformer = require('./transformers/ticker')
const tradeTransformer = require('./transformers/trade')
const chanDataToSubscription = require('./chan_data_to_subscription')
const intervalToMinutes = require('./interval_to_minutes')
const isWSChannel = require('./is_ws_channel')
const recvMessage = require('./recv/message')

const KRAKEN_WS_URL = 'wss://ws.kraken.com'
const REST_UPDATE_INTERVAL_MS = 5 * 1000

class KrakenExchangeConnection {
  constructor () {
    this.d = debug
    this.ws = null
    this.subs = {}
    this.pendingSubs = {}
    this.rest = kraken()
    this.dataListeners = []
    this.preOpenBuffer = []
    this.channelMap = {}
    this.restSyncs = {}
    this.restSyncIntervals = {}
    this.restLastData = {}
    this.wsOpen = false
  }

  onData (cb) {
    this.dataListeners.push(cb)
  }

  openWS (args = {}) {
    this.ws = new WS(KRAKEN_WS_URL)

    this.ws.on('open', this.onWSOpen.bind(this))
    this.ws.on('message', (msgJSON) => recvMessage(this, msgJSON))
    this.ws.on('error', this.onWSError.bind(this))
  }

  close () {
    if (this.ws) {
      this.ws.close()
      this.wsOpen = false
      this.pendingSubs = {}
      this.channelMap = {}
    } else {
      debug('ws not initialized, cannot close sockets')
    }

    Object.values(this.restSyncIntervals).forEach((syncInterval) => {
      clearInterval(syncInterval)
    })

    Object.values(this.restSyncs).forEach((sync) => {
      sync.close()
    })

    this.restSycs = {}
    this.restSyncIntervals = {}
  }

  onWSOpen () {
    this.wsOpen = true

    this.preOpenBuffer.forEach(msg => {
      this.ws.send(JSON.stringify(msg))
    })

    this.preOpenBuffer = []
  }

  send (msg) {
    if (this.wsOpen) {
      this.ws.send(JSON.stringify(msg))
    } else {
      this.preOpenBuffer.push(msg)
    }
  }

  onWSError (err) {
    debug('error: %s', err.message)
  }

  async subscribeREST (channelData) {
    const cdKey = chanDataToKey(channelData)

    if (this.subs[cdKey]) {
      return this.subs[cdKey] // return existing chanId
    }

    const [type] = channelData
    const channelID = nonce()
    const subscription = { channelID }
    const subscriptionPayload = {}

    switch (type) {
      case 'candles': {
        subscription.name = 'OHLC'
        subscriptionPayload.pair = channelData[2].r
        subscriptionPayload.interval = intervalToMinutes(channelData[1])
        break
      }

      case 'ticker': {
        subscription.name = 'Ticker'
        subscriptionPayload.pair = channelData[1].r
        break
      }

      case 'book': {
        subscription.name = 'Depth'
        subscriptionPayload.pair = channelData[1].r
        subscriptionPayload.count = 25
        break
      }

      case 'trades': {
        subscription.name = 'Trades'
        subscriptionPayload.pair = channelData[1].r
        break
      }

      default: {
        debug('recv subscription req for unknown channel type: %j', channelData)
        return channelID
      }
    }

    Object.assign(subscription, subscriptionPayload)

    debug('subscribing to rest channel %j', subscription)

    const syncObject = this.rest.sync(subscription.name, subscriptionPayload)

    this.subs[cdKey] = channelID
    this.channelMap[`${channelID}`] = { channelID, ...subscription }
    this.restLastData[`${channelID}`] = 0
    this.restSyncs[`${channelID}`] = syncObject
    this.restSyncIntervals[`${channelID}`] = setInterval(() => {
      this.handleRESTUpdate(channelID, syncObject.data)
    }, REST_UPDATE_INTERVAL_MS)

    return channelID
  }

  handleRESTUpdate (channelID, res) {
    const channel = this.channelMap[`${channelID}`]

    if (!channel) {
      return debug('recv REST data for unknown channel: %s', channelID)
    }

    const { name } = channel
    const data = Object.values(res)[0]

    if (!data) { // could be too early for the sync worker
      return
    }

    const payloads = []

    switch (name) {
      case 'OHLC': {
        payloads.push(candleTransformer(data[data.length - 2], true))
        payloads.push(candleTransformer(data[data.length - 1], true))
        break
      }

      case 'Trades': {
        let trade
        let last

        const trades = data.map(tradeTransformer)

        for (let i = 0; i < trades.length; i += 1) {
          trade = trades[i]
          last = this.restLastData[`${channelID}`]

          if (trade.mts >= last) {
            payloads.push(trade)
            this.restLastData[`${channelID}`] = trade.mts
          }
        }

        break
      }

      case 'Depth': {
        payloads.push(['full', bookTransformer(data)])
        break
      }

      case 'Ticker': {
        payloads.push(tickerTransformer(data))
        break
      }

      default: {
        console.log({ channel, data })
        break
      }
    }

    if (payloads.length > 0) {
      this.dataListeners.forEach((l) => {
        payloads.forEach((payload) => {
          l(channelID, payload)
        })
      })
    }
  }

  async subscribe (channelData) {
    if (!isWSChannel(channelData) || channelData[0] === 'book') {
      return this.subscribeREST(channelData)
    }

    const cdKey = chanDataToKey(channelData)

    if (this.subs[cdKey]) {
      return this.subs[cdKey] // return existing chanId
    }

    const [type] = channelData
    const subscription = chanDataToSubscription(channelData)

    if (subscription === null) {
      throw new Error(`unknown channel type: ${type}`)
    }

    const packet = {
      event: 'subscribe',
      pair: [_last(channelData).w],
      subscription
    }

    debug('subscribing to ws channel %j', channelData)

    this.send(packet)

    return new Promise((resolve) => {
      this.pendingSubs[cdKey] = resolve
    })
  }

  unsubscribe (channelData) {
    const cdKey = chanDataToKey(channelData)
    const chanID = this.subs[cdKey]

    if (!chanID) {
      throw new Error('tried to unsub from unknown channel')
    }

    debug('unsubscribing from channel %s', chanID)

    const [type] = channelData
    const subscription = chanDataToSubscription(channelData)

    if (subscription === null) {
      throw new Error(`unknown channel type: ${type}`)
    }

    const packet = {
      event: 'unsubscribe',
      pair: [_last(channelData).w],
      subscription
    }

    this.send(packet)

    return chanID
  }

  isSubscribed (channelData) {
    return !!this.getChannelID(channelData)
  }

  getChannelID (channelData) {
    const cdKey = chanDataToKey(channelData)
    return this.subs[cdKey]
  }

  getMarkets () {
    return this.rest.call('AssetPairs').then(res => {
      return Object.values(res).map(pair => ({
        u: pair.wsname || `${pair.base}/${pair.quote}`,
        r: pair.altname,
        w: pair.wsname,
        b: pair.base,
        q: pair.quote,
        c: pair.altname.match(/\.d/) ? ['d'] : ['e']
      }))
    })
  }

  static getCandleTimeFrames () {
    return [
      '1m', '5m', '15m', '30m', '1h', '4h', '1d', '7d', '15d'
    ]
  }
}

KrakenExchangeConnection.id = 'kraken'

module.exports = KrakenExchangeConnection

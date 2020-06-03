'use strict'

const nonce = require('../../util/nonce')
const WSClient = require('../../ws_client')
const send = require('../../util/ws/send')

const onDataCandles = require('./on_data_candles')
const onBacktestEnd = require('./on_backtest_end')

const dsProxyHandler = (action, msgGetReqId) => {
  return (dsClient, msg) => {
    const { d } = dsClient
    const { requests } = dsClient

    const reqId = msgGetReqId(msg)
    const ws = requests[reqId]

    if (!ws) {
      return d(`recv ${action} data for unknown req ID: %s`, reqId)
    }

    send(ws, msg)
  }
}

module.exports = class HFDSClient extends WSClient {
  constructor ({ url, id, symbolTransformer = s => s }) {
    super({
      url,
      debugName: `hf-ds-${id}`,
      msgHandlers: {
        'data.candles': onDataCandles,
        'data.sync.start': dsProxyHandler('data.sync.start', ([,,,,,, reqID]) => reqID),
        'data.sync.end': dsProxyHandler('data.sync.end', ([,,,,,, reqID]) => reqID),
        'bt.start': dsProxyHandler('bt.start', ([,,,,,,,, reqID]) => reqID),
        'bt.end': onBacktestEnd,
        'bt.candle': dsProxyHandler('bt.candle', ([,,,, reqID]) => reqID),
        'bt.trade': dsProxyHandler('bt.trade', ([,,, reqID ]) => reqID),
      }
    })

    this.requests = {} // [reqID]: ws
    this.promises = {} // [reqID]: p
    this.symbolTransformer = symbolTransformer
  }

  execBacktest(ws, { exID, from, to, symbol, tf, candles, trades, sync }) {
    const reqID = `${nonce()}-${symbol}-${tf}-${from}-${to}`
    const finalSymbol = this.symbolTransformer(symbol)

    this.requests[reqID] = ws
    this.send(['exec.bt', [exID, from, to, finalSymbol, tf, candles, trades, sync, reqID]])

    return new Promise((resolve) => {
      this.promises[reqID] = resolve
    })
  }

  getCandles (ws, { exID, symbol, tf, start, end }, uiMarket) {
    const reqID = `${nonce()}-${uiMarket}`
    const finalSymbol = this.symbolTransformer(symbol)

    this.requests[reqID] = ws
    this.send(['get.candles', exID, finalSymbol, tf, 'trade', start, end, reqID])

    return new Promise((resolve) => {
      this.promises[reqID] = resolve
    })
  }
}

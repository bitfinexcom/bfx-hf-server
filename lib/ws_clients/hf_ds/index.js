'use strict'

const nonce = require('../../util/nonce')
const WSClient = require('../../ws_client')
const send = require('../../util/ws/send')

const onBacktestEnd = require('./on_backtest_end')
const onBacktestResult = require('./on_backtest_result')

const dsProxyHandler = (action, msgGetReqId = (m) => { return m[m.length - 1] }) => {
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
        'data.sync.start': dsProxyHandler('data.sync.start', ([,,,,,, reqID]) => reqID),
        'data.sync.end': dsProxyHandler('data.sync.end', ([,,,,,, reqID]) => reqID),
        'bt.start': dsProxyHandler('bt.start', ([,,,,,,,, reqID]) => reqID),
        'bt.end': onBacktestEnd,
        'bt.candle': dsProxyHandler('bt.candle', ([,,,, reqID]) => reqID),
        'bt.trade': dsProxyHandler('bt.trade', ([,,, reqID]) => reqID),

        'bt.progress': dsProxyHandler('bt.progress'),
        'bt.btresult': onBacktestResult
      }
    })

    this.requests = {} // [reqID]: ws
    this.promises = {} // [reqID]: p
    this.symbolTransformer = symbolTransformer
  }

  execBacktestServerside (ws, { exID, from, to, symbol, tf, candles, trades, sync, strategy }) {
    const reqID = `${nonce()}-${symbol}-${tf}-${from}-${to}`
    const finalSymbol = this.symbolTransformer(symbol)

    this.requests[reqID] = ws
    this.send(['exec.str', [exID, from, to, finalSymbol, tf, candles, trades, sync, strategy, reqID]])

    return new Promise((resolve) => {
      this.promises[reqID] = resolve
    })
  }

  execBacktest (ws, { exID, from, to, symbol, tf, candles, trades, sync }) {
    const reqID = `${nonce()}-${symbol}-${tf}-${from}-${to}`
    const finalSymbol = this.symbolTransformer(symbol)

    this.requests[reqID] = ws
    this.send(['exec.bt', [exID, from, to, finalSymbol, tf, candles, trades, sync, reqID]])

    return new Promise((resolve) => {
      this.promises[reqID] = resolve
    })
  }
}

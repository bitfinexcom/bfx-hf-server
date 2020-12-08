'use strict'

const nonce = require('../../util/nonce')
const WSClient = require('../../ws_client')
const send = require('../../util/ws/send')

const onDataCandles = require('./on_data_candles')
const onBacktestEnd = require('./on_backtest_end')
const onBacktestResult = require('./on_backtest_result')
const onLsCoresResponse = require('./on_list_cores')
const onRmCoresResponse = require('./on_rm_cores')

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
        'data.candles': onDataCandles,
        'data.sync.start': dsProxyHandler('data.sync.start', ([,,,,,, reqID]) => reqID),
        'data.sync.end': dsProxyHandler('data.sync.end', ([,,,,,, reqID]) => reqID),
        'bt.start': dsProxyHandler('bt.start', ([,,,,,,,, reqID]) => reqID),
        'bt.end': onBacktestEnd,
        'bt.candle': dsProxyHandler('bt.candle', ([,,,, reqID]) => reqID),
        'bt.trade': dsProxyHandler('bt.trade', ([,,, reqID]) => reqID),

        'bt.progress': dsProxyHandler('bt.progress'),
        'bt.btresult': onBacktestResult,
        'man.ls': onLsCoresResponse,
        'man.rm': onRmCoresResponse
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

  execDazaar (ws, data) {
    const [, from, to, symbol,, tf] = data
    const reqID = `${nonce()}-${symbol}-${tf}-${from}-${to}`
    this.requests[reqID] = ws
    this.send(['exec.dazaar', [...data, reqID]])

    return new Promise((resolve) => {
      this.promises[reqID] = resolve
    })
  }

  listDazaarCores (ws, data) {
    const reqID = `${nonce()}-${Math.random() * 10}`
    this.requests[reqID] = ws
    this.send(['manage.cores', [...data, null, reqID]])
    return new Promise((resolve) => {
      this.promises[reqID] = resolve
    })
  }

  removeDazaarCores (ws, data) {
    const reqID = `${nonce()}-${Math.random() * 10}`
    this.requests[reqID] = ws
    this.send(['manage.cores', [...data, reqID]])
    return new Promise((resolve) => {
      this.promises[reqID] = resolve
    })
  }

  execBacktest (ws, data) {
    const { from, to, symbol, tf } = data
    const reqID = `${nonce()}-${symbol}-${tf}-${from}-${to}`

    this.requests[reqID] = ws
    this.send(['exec.bt', data])

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

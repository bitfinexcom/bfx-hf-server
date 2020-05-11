'use strict'

const nonce = require('../../util/nonce')
const WSClient = require('../../ws_client')

const onDataCandles = require('./on_data_candles')
const onDataSyncStart = require('./on_data_sync_start')
const onDataSyncEnd = require('./on_data_sync_end')
const onBacktestStart = require('./on_backtest_start')
const onBacktestEnd = require('./on_backtest_end')
const onBacktestCandle = require('./on_backtest_candle')
const onBacktestTrade = require('./on_backtest_trade')


module.exports = class HFDSClient extends WSClient {
  constructor ({ url, id, symbolTransformer = s => s }) {
    super({
      url,
      debugName: `hf-ds-${id}`,
      msgHandlers: {
        'data.candles': onDataCandles,
        'data.sync.start': onDataSyncStart,
        'data.sync.end': onDataSyncEnd,
        'bt.start': onBacktestStart,
        'bt.end': onBacktestEnd,
        'bt.candle': onBacktestCandle,
        'bt.trade': onBacktestTrade,
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

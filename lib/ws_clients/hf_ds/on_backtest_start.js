'use strict'

const send = require('../../util/ws/send')

/*

    ['data.sync.start', exchange, symbol, timeFrame, from, to, meta] - when a sync process starts
    ['data.sync.end', exchange, symbol, timeFrame, from, to, meta] - when a sync process end
    ['bt.start', null, null, from, to, null, nTrades, nCandles] - before the backtest data stream
    ['bt.end', null, null, from, to] - after the backtest data stream
    ['bt.candle', null, null, candle] - individual BT candle
    ['bt.trade', null, trade] - individual BT trade

*/

// NOTE: Data server symbol may differ from the requested symbol
module.exports = (dsClient, msg) => {
  const { requests } = dsClient
  const [,,,,,,,, reqID] = msg
  const ws = requests[reqID]

  if (!ws) {
    return d('recv bt.start data for unknown req ID: %s', reqID)
  }

  send(ws, msg)
}

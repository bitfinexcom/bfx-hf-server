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
  const { requests, promises } = dsClient
  const [,,,,, reqID ] = msg
  const ws = requests[reqID]

  if (!ws) {
    return d('recv bt.end data for unknown req ID: %s', reqID)
  }

  console.log(msg)
  send(ws, msg)

  promises[reqID]()

  delete requests[reqID]
  delete promises[reqID]
}

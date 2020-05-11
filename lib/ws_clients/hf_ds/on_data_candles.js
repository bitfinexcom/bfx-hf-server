'use strict'

const send = require('../../util/ws/send')

// NOTE: Data server symbol may differ from the requested symbol
module.exports = (dsClient, msg) => {
  const { d, requests, promises } = dsClient
  const [, exID,, tf,, start, end, reqID, candles] = msg
  const ws = requests[reqID]
  const symbol = reqID.split('-')[1]

  if (!ws) {
    return d('recv candle data for unknown req ID: %s', reqID)
  }

  send(ws, ['data.candles', exID, symbol, tf, start, end, candles])

  promises[reqID](candles)

  delete requests[reqID]
  delete promises[reqID]
}

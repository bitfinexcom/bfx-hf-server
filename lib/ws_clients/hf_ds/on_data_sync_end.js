'use strict'

const send = require('../../util/ws/send')

module.exports = (dsClient, msg) => {
  const { d, requests } = dsClient
  const [, exID, symbol, tf, start, end, reqID] = msg
  const ws = requests[reqID]

  if (!ws) {
    return d('recv sync end for unknown req ID: %s', reqID)
  }

  send(ws, ['data.sync.end', exID, symbol, tf, start, end])
}

'use strict'

const send = require('../../util/ws/send')

module.exports = (dsClient, msg) => {
  const { d, requests } = dsClient
  const [, exID, symbol, tf, start, end, reqID] = msg
  const ws = requests[reqID]

  if (!ws) {
    return d('recv sync start for unknown req ID: %s', reqID)
  }

  send(ws, ['data.sync.start', exID, symbol, tf, start, end])
}

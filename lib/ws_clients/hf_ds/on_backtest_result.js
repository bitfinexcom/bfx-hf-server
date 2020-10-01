'use strict'

const send = require('../../util/ws/send')

module.exports = (dsClient, msg) => {
  const { d, requests, promises } = dsClient

  const reqID = msg[msg.length - 1]
  const ws = requests[reqID]

  if (!ws) {
    return d('recv bt.btresult data for unknown req ID: %s', reqID)
  }

  send(ws, msg)

  promises[reqID]()

  delete requests[reqID]
  delete promises[reqID]
}

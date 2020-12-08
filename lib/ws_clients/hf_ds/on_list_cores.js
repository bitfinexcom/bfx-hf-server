'use strict'

const send = require('../../util/ws/send')

module.exports = (dsClient, msg) => {
  const { d, requests, promises } = dsClient
  const { reqID, res } = msg[1]
  const ws = requests[reqID]

  if (!ws) {
    return d('recv man.ls cores for unknown req ID: %s', reqID)
  }
  d(msg)
  send(ws, ['dazaar.lsresult', res])

  promises[reqID]()

  delete requests[reqID]
  delete promises[reqID]
}

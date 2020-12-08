'use strict'

const { notifySuccess } = require('../../util/ws/notify')
module.exports = (dsClient, msg) => {
  const { d, requests, promises } = dsClient
  const { reqID } = msg[1]
  const ws = requests[reqID]

  if (!ws) {
    return d('recv man.rm cores for unknown req ID: %s', reqID)
  }
  notifySuccess(ws, 'Cores has been removed sucessfuly')
  promises[reqID]()
  delete requests[reqID]
  delete promises[reqID]
}

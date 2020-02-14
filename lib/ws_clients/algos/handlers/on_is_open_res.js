'use strict'

const send = require('../../../util/ws/send')

module.exports = (client, msg) => {
  const { isOpenCallbacks, userWS } = client
  const [, reqID, isOpen] = msg

  if (!isOpenCallbacks[reqID]) {
    return
  }

  // fulfill pending promise
  isOpenCallbacks[reqID](isOpen)
  delete isOpenCallbacks[reqID]
}

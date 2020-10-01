'use strict'

module.exports = (client, msg) => {
  const { isOpenCallbacks } = client
  const [, reqID, isOpen] = msg

  if (!isOpenCallbacks[reqID]) {
    return
  }

  // fulfill pending promise
  isOpenCallbacks[reqID](isOpen)
  delete isOpenCallbacks[reqID]
}

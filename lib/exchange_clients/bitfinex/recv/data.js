'use strict'

const transform = require('../transform')

module.exports = (exa, msg) => {
  const { ws, d, dataListeners } = exa
  const [chanID, msgType, msgData] = msg

  if (msgType === 'hb') { // don't pass heartbeats
    return
  }

  if (String(chanID) !== '0') {
    d('error, recv data for unknown channel %s: %j', chanID, msg)
    d('unsubscribing...')

    ws.unsubscribe(chanID)
    return
  }

  // bitfinex sends latest channel data immediately after subscribing
  // give subscription promises a chance to resolve
  setTimeout(() => {
    for (let i = 0; i < dataListeners.length; i += 1) {
      dataListeners[i]([msgType, transform(msgType, msgData)])
    }
  }, 0)
}

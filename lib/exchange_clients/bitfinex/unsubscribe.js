'use strict'

const chanDataToKey = require('../../util/chan_data_to_key')

module.exports = (exa, channelData) => {
  const { d, ws, subs, channelMap } = exa

  const cdKey = chanDataToKey(channelData)
  const chanID = subs[cdKey]

  d('unsubscribing from channel %s', chanID)

  if (!chanID) {
    d('error: channel %s not found', chanID)
    return
  }

  switch (channelData[0]) {
    case 'candles': {
      ws.unsubscribe(chanID)
      break
    }

    case 'ticker': {
      ws.unsubscribe(chanID)
      break
    }

    case 'trades': {
      ws.unsubscribe(chanID)
      break
    }

    case 'book': {
      ws.unsubscribe(chanID)
      break
    }

    default: {
      throw new Error('unknown channel type: %j', channelData)
    }
  }

  delete subs[cdKey]
  delete channelMap[`${chanID}`]

  return chanID
}

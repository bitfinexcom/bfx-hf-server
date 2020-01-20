'use strict'

const chanKeytoData = require('../../../util/chan_key_to_data')
const minutesToInterval = require('../util/minutes_to_interval')

module.exports = (exa, msg) => {
  const { d, pendingSubs, subs, channelMap } = exa
  const { channelID, pair, subscription } = msg
  const { name, interval } = subscription
  const pendingSubKeys = Object.keys(pendingSubs)

  d('subscribed to %s for %s', name, pair)

  let pendingSubMatches
  let pendingSubData
  let pendingSubKey

  for (let i = 0; i < pendingSubKeys.length; i += 1) {
    pendingSubMatches = false
    pendingSubKey = pendingSubKeys[i]
    pendingSubData = chanKeytoData(pendingSubKey)

    const { type } = pendingSubData

    if (
      (type === 'trades' && name === 'trade' && pair === pendingSubData.symbol) ||
      (type === 'ticker' && name === 'ticker' && pair === pendingSubData.symbol) ||
      (type === 'book' && name === 'book' && pair === pendingSubData.symbol)
    ) {
      pendingSubMatches = true
    } else if (type === 'candles' && name === 'ohlc') {
      const [, tf, symbol] = pendingSubData.key.split(':')

      if (pair === symbol && minutesToInterval(interval) === tf) {
        pendingSubMatches = true
      }
    }

    if (pendingSubMatches) {
      pendingSubs[pendingSubKey](channelID)
      subs[pendingSubKey] = channelID
      channelMap[`${channelID}`] = {
        ...subscription,
        channelID,
        pair
      }
    }
  }
}

'use strict'

const tickerTransformer = require('../transformers/ticker')
const tradeTransformer = require('../transformers/trade')
const candleTransformer = require('../transformers/candle')

module.exports = (exa, msg) => {
  const { d, channelMap, dataListeners } = exa
  const [channelID] = msg
  const channel = channelMap[`${channelID}`]

  if (!channel) {
    return d('recv data for unknown channel: %j', msg)
  }

  const { name } = channel
  const payloads = []

  switch (name) {
    case 'ticker': {
      payloads.push(tickerTransformer(msg[1]))
      break
    }

    case 'trade': {
      msg[1].forEach(trade => {
        payloads.push(tradeTransformer(trade))
      })
      break
    }

    case 'ohlc': {
      payloads.push(candleTransformer(msg[1]))
      break
    }

    default: {
      console.log(msg)
    }
  }

  if (payloads.length === 0) {
    return
  }

  for (let i = 0; i < dataListeners.length; i += 1) {
    for (let j = 0; j < payloads.length; j += 1) {
      dataListeners[i](channelID, payloads[j])
    }
  }
}

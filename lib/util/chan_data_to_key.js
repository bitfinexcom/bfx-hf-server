'use strict'

module.exports = (channelData) => {
  const revisedChannelData = { type: channelData[0] }

  switch (channelData[0]) {
    case 'candles': {
      revisedChannelData.key = `trade:${channelData[1]}:${channelData[2].wsID || channelData[2].restID}`
      break
    }

    case 'book':
    case 'trades':
    case 'ticker': {
      revisedChannelData.symbol = channelData[1].wsID || channelData[1].restID
      break
    }
  }

  const keys = Object.keys(revisedChannelData)
  return keys.map(k => `${k}-${revisedChannelData[k]}`).join('|')
}

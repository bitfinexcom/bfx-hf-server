'use strict'

module.exports = (channelData) => {
  const revisedChannelData = { type: channelData[0] }

  switch (channelData[0]) {
    case 'book':
    case 'trades': {
      revisedChannelData.symbol = channelData[1].wsID || channelData[1].restID
      break
    }
  }

  const keys = Object.keys(revisedChannelData)
  return keys.map(k => `${k}-${revisedChannelData[k]}`).join('|')
}

'use strict'

const intervalToMinutes = require('./interval_to_minutes')

module.exports = (channelData) => {
  const [type] = channelData

  switch (type) {
    case 'trades': {
      return { name: 'trade' }
    }

    case 'ticker': {
      return { name: 'ticker' }
    }

    case 'book': {
      return {
        name: 'book',
        depth: 25
      }
    }

    case 'candles': {
      return {
        name: 'ohlc',
        interval: intervalToMinutes(channelData[1])
      }
    }

    default: {
      return null
    }
  }
}

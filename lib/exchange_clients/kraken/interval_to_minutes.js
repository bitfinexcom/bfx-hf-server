'use strict'

const INTERVALS = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '4h': 240,
  '1d': 1440,
  '7d': 10080,
  '15d': 21600
}

module.exports = i => INTERVALS[i]

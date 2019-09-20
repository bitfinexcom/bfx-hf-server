'use strict'

const INTERVALS = {
  1: '1m',
  5: '5m',
  15: '15m',
  30: '30m',
  60: '1h',
  240: '4h',
  1440: '1d',
  10080: '7d',
  21600: '15d'
}

module.exports = m => INTERVALS[`${m}`]

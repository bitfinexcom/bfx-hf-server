'use strict'

const _last = require('lodash/last')

module.exports = (channelData) => {
  const market = _last(channelData)
  return !!market.wsID
}

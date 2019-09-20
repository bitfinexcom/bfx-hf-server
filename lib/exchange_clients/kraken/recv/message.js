'use strict'

const _isArray = require('lodash/isArray')
const recvSubscriptionStatus = require('./subscription_status')
const recvChannelData = require('./channel_data')

module.exports = (exa, msgJSON) => {
  const { d } = exa
  let msg

  try {
    msg = JSON.parse(msgJSON)
  } catch (e) {
    return d('recv malformed JSON from kraken: %s', msgJSON)
  }

  const { event: e } = msg

  switch (e) {
    case 'subscriptionStatus': {
      return recvSubscriptionStatus(exa, msg)
    }

    default: {
      if (_isArray(msg)) {
        return recvChannelData(exa, msg)
      }
    }
  }
}

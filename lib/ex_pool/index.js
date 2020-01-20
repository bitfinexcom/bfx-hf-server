'use strict'

const debug = require('debug')

module.exports = () => ({
  d: debug('bfx:hf:api:ex-pool'),
  exchangeClients: {},
  subscriptions: {},
  dataListeners: []
})

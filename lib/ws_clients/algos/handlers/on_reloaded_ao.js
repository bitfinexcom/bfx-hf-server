'use strict'

const send = require('../../../util/ws/send')

module.exports = (client, msg) => {
  const { userWS } = client

  send(userWS, ['algo.cancel_orders'])
}

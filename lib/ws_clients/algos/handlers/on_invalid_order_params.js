'use strict'

const send = require('../../../util/ws/send')

module.exports = (client, msg) => {
  const { userWS } = client
  const [, orderParamsError] = msg

  if (!userWS) {
    return null
  }

  send(userWS, ['order.invalid_params', orderParamsError])
}

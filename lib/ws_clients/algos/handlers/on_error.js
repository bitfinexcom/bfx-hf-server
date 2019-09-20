'use strict'

const { notifyError } = require('../../../util/ws/notify')

module.exports = (client, msg) => {
  const { userWS } = client
  const [, error] = msg

  if (!userWS) {
    return null
  }

  notifyError(userWS, error)
}

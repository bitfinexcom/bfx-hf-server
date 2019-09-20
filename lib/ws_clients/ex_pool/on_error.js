'use strict'

module.exports = (poolClient, msg) => {
  const { d } = poolClient
  const [, message] = msg

  d('recv error: %s', message)
}

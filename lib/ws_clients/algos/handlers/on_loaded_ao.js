'use strict'

const send = require('../../../util/ws/send')

module.exports = (client, msg) => {
  const { userWS, d } = client
  const [,, gid] = msg

  d('ao instance loaded %s', gid)
  send(userWS, ['algo.order_loaded', gid])
}

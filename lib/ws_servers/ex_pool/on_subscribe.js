'use strict'

const send = require('../../util/ws/send')
const sendError = require('../../util/ws/send_error')
const poolSubscribe = require('../../ex_pool/subscribe')

module.exports = async (server, ws, msg) => {
  const { pool, d, wsURL, restURL } = server
  const [, exID, channel] = msg

  let chanID

  try {
    const opts = { wsURL, restURL }
    chanID = await poolSubscribe({ pool, exID, channel, opts })
  } catch (err) {
    d('error subscribing to %s %j: %s', exID, channel, err.stack)
    return sendError(ws, 'Internal error subscribing')
  }

  if (!ws.subscriptions[exID]) {
    ws.subscriptions[exID] = {}
  }

  ws.subscriptions[exID][`${chanID}`] = channel
  send(ws, ['subscribed', exID, chanID, channel])
}

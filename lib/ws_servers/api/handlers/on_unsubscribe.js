'use strict'

const _isEqual = require('lodash/isEqual')
const validateParams = require('../../../util/ws/validate_params')

module.exports = (server, ws, msg) => {
  const { exchangeClient } = server
  const [, exID, channelData] = msg

  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    channelData: { type: 'object', v: channelData }
  })

  if (!validRequest) {
    console.error('invalid request', msg)
    return
  }

  const { d } = server

  if (!(ws.subscriptions || {})[exID]) {
    return d(
      'warning: client %s tried to unsub from channel %j when not on exchange %s',
      ws.id, channelData, exID
    )
  }

  const subIndex = ws.subscriptions[exID].findIndex(cd => (
    _isEqual(cd, channelData)
  ))

  if (subIndex < 0) {
    return d(
      'error: client %s tried to unsub from non-subscribed channel on %s: %j',
      ws.id, exID, channelData
    )
  }

  exchangeClient.unsubscribe(channelData)
  ws.subscriptions[exID].splice(subIndex, 1)
}

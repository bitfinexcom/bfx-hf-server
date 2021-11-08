'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const isAuthorized = require('../../../util/ws/is_authorized')
const validateParams = require('../../../util/ws/validate_params')

module.exports = async (server, ws, msg) => {
  const { d } = server
  const [, authToken, keys] = msg

  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    keys: { type: 'array', v: keys }
  })

  if (!validRequest) {
    d('invalid request: get_core_settings')
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  } else if (!ws.clients.bitfinex) {
    return sendError(ws, 'No client open for Bitfinex', ['noClientOpenFor', { target: 'Bitfinex' }])
  }

  try {
    const bfxClient = ws.clients.bitfinex
    const coreSettings = await bfxClient.rest.getCoreSettings(keys)
    const mappedCoreSettings = coreSettings.map(({ key, value }) => { return { key, value } })

    send(ws, ['data.core_settings', mappedCoreSettings])
  } catch(err) {
    sendError(ws, `Error fetching core settings for: ${JSON.stringify(keys)}`, ['errorFetchingCoreSettings', { keys: JSON.stringify(keys) }])
    d('error fetching core settings for %s: %s', JSON.stringify(keys), err.stack)
  }
}

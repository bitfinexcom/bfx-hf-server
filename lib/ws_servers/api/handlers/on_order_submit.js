'use strict'

const { _default: DEFAULT_SETTINGS } = require('bfx-hf-ui-config').UserSettings
const _capitalize = require('lodash/capitalize')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const { notifyInfo, notifyErrorBitfinex } = require('../../../util/ws/notify')

module.exports = async (server, ws, msg) => {
  const { d, db } = server
  const { UserSettings } = db
  const [, authToken, exID, packet] = msg
  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    authToken: { type: 'string', v: authToken },
    packet: { type: 'object', v: packet }
  })

  if (!validRequest) {
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  } else if (exID !== 'bitfinex') {
    return sendError(ws, 'Unrecognised exchange, cannot submit order')
  } else if (!ws.clients[exID]) {
    return sendError(ws, `No client open for ${_capitalize(exID)}`)
  } else if (exID != 'bitfinex') {
    return d('unknown exID broke through: %s', exID)
  }

  const { userSettings = DEFAULT_SETTINGS } = await UserSettings.getAll()

  if (!packet.meta) {
    packet.meta = {}
  }

  packet.meta.aff_code = userSettings.affiliateCode // eslint-disable-line

  try {
    notifyInfo(ws, 'Submitting order to Bitfinex')
    await ws.clients.bitfinex.submitOrder(packet)

    d('sucessfully submitted order [bitfinex]')
  } catch (error) {
    d('failed to submit order [bitfinex]', error)
    notifyErrorBitfinex(ws, error)
  }
}

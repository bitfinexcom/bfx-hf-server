'use strict'

const { _default: DEFAULT_SETTINGS } = require('bfx-hf-ui-config').UserSettings
const _capitalize = require('lodash/capitalize')
const sendError = require('../../../util/ws/send_error')
const send = require('../../../util/ws/send')
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
  const sendStatus = (status) => send(ws, ['data.order.submit_status', status, packet ? packet.type : null])

  if (!validRequest) {
    sendStatus('failed')
    return
  }

  if (!isAuthorized(ws, authToken)) {
    sendStatus('failed')
    return sendError(ws, 'Unauthorized')
  } else if (exID !== 'bitfinex') {
    sendStatus('failed')
    return sendError(ws, 'Unrecognised exchange, cannot submit order')
  } else if (!ws.clients[exID]) {
    sendStatus('failed')
    return sendError(ws, `No client open for ${_capitalize(exID)}`)
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
    sendStatus('success')
  } catch (error) {
    d('failed to submit order [bitfinex]', error)
    sendStatus('failed')
    notifyErrorBitfinex(ws, error)
  }
}

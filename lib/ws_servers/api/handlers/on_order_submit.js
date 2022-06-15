'use strict'

const _capitalize = require('lodash/capitalize')
const sendError = require('../../../util/ws/send_error')
const send = require('../../../util/ws/send')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const { notifyInfo, notifyErrorBitfinex } = require('../../../util/ws/notify')
const getUserSettings = require('../../../util/user_settings')

module.exports = async (server, ws, msg) => {
  const { d, db } = server
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

  const bfxClient = ws.getClient()

  if (!isAuthorized(ws, authToken)) {
    sendStatus('failed')
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  } else if (exID !== 'bitfinex') {
    sendStatus('failed')
    return sendError(ws, 'Unrecognised exchange, cannot submit order', ['unrecognisedExchange'])
  } else if (!bfxClient) {
    sendStatus('failed')
    return sendError(ws, `No client open for ${_capitalize(exID)}`, ['noClientOpenFor', { target: exID }])
  }

  const { affiliateCode } = await getUserSettings(db)

  if (!packet.meta) {
    packet.meta = {}
  }

  packet.meta.aff_code = affiliateCode

  try {
    notifyInfo(ws, 'Submitting order to Bitfinex', ['submittingOrderTo', { target: 'Bitfinex' }])
    await bfxClient.submitOrder(packet)

    d('sucessfully submitted order [bitfinex]')
    sendStatus('success')
  } catch (error) {
    d('failed to submit order [bitfinex]', error)
    sendStatus('failed')
    notifyErrorBitfinex(ws, error)
  }
}

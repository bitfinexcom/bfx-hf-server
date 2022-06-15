'use strict'

const sendError = require('../../../util/ws/send_error')
const send = require('../../../util/ws/send')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const { notifyInfo, notifyErrorBitfinex } = require('../../../util/ws/notify')

module.exports = async (server, ws, msg) => {
  const { d } = server
  const [, authToken, packet] = msg
  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    packet: { type: 'object', v: packet }
  })

  const orderId = packet ? packet.id : null
  const sendStatus = (status) => send(ws, ['data.order.update_status', status, orderId])

  if (!validRequest) {
    d('order update: invalid request')
    sendStatus('failed')
    return
  }

  const bfxClient = ws.getClient()

  if (!isAuthorized(ws, authToken)) {
    sendStatus('failed')
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  } else if (!bfxClient) {
    sendStatus('failed')
    return sendError(ws, 'No client open for Bitfinex', ['noClientOpenFor', { target: 'Bitfinex' }])
  }

  try {
    notifyInfo(ws, `Updating order (ID: ${orderId})`, ['updatingOrderWithId', { orderId }])
    await bfxClient.updateOrder(packet)

    d(`successfully updated order [ID: ${orderId}]`)
    sendStatus('success')
  } catch (error) {
    d(`failed to update order [ID: ${orderId}]`, error)
    sendStatus('failed')
    notifyErrorBitfinex(ws, error)
  }
}

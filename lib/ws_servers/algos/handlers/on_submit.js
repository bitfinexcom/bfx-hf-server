'use strict'

const sendError = require('../../../util/ws/send_error')
const sendInvalidOrderParamsError = require('../../../util/ws/send_invalid_order_params_error')
const validateParams = require('../../../util/ws/validate_params')

const getHostKey = require('../util/get_host_key')
const validateAO = require('../util/validate_ao')
const validateMinMaxSize = require('../util/validate_min_max_size')

module.exports = async (server, ws, msg) => {
  const { d, hosts, apiDB } = server
  const [, userID, exID, aoID, packet] = msg
  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    userID: { type: 'string', v: userID },
    aoID: { type: 'string', v: aoID },
    packet: { type: 'object', v: packet }
  })

  if (!validRequest) {
    return
  } else if (!ws.userID) {
    return sendError(ws, 'Not identified')
  } else if (ws.userID !== userID) {
    d('tried to submit AO for user that differs from ws ident (%s)', userID)
    return sendError(ws, 'Unauthorised')
  }

  const key = getHostKey(userID, exID)
  const host = hosts[key]

  if (!host) {
    return sendError(ws, `Host not open for user ${userID} on exchange ${exID}`)
  }

  const validationError = validateAO(host, aoID, packet)

  if (validationError) {
    return sendInvalidOrderParamsError(ws, validationError)
  }

  const minMaxSizeError = await validateMinMaxSize(apiDB, packet)

  if (minMaxSizeError) {
    return sendInvalidOrderParamsError(ws, minMaxSizeError)
  }

  try {
    const gid = await host.startAO(aoID, packet)
    d('started AO for user %s on exchange %s [%s]', userID, exID, gid)
  } catch (e) {
    d('error starting AO %s for %s: %s', aoID, exID, e.stack)
    return sendError(ws, 'Failed to start algo order')
  }
}

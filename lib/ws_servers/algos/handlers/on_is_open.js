'use strict'

const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')

const getHostKey = require('../util/get_host_key')

module.exports = async (server, ws, msg) => {
  const { d, hosts } = server
  const [, userID, exID] = msg
  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    userID: { type: 'string', v: userID }
  })

  if (!validRequest) {
    return
  } else if (exID !== 'bitfinex') {
    return sendError(ws, 'Only Bitfinex is currently supported for algo orders')
  } else if (!ws.userID) {
    return sendError(ws, 'Not identified')
  } else if (ws.userID !== userID) {
    d('tried to query host for user that differs from ws ident (%s)', userID)
    return sendError(ws, 'Unauthorised')
  }

  const key = getHostKey(userID, exID)
  const existingHost = hosts[key]

  server.response(ws, msg, [Boolean(existingHost)])
}

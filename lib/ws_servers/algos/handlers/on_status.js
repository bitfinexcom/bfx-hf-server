'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')

module.exports = (server, ws, msg) => {
  const { d } = server
  const [, userID] = msg
  const validRequest = validateParams(ws, {
    userID: { type: 'string', v: userID }
  })

  if (!validRequest) {
    return
  }

  if (!ws.userID) {
    return sendError(ws, 'Not identified')
  } else if (ws.userID !== userID) {
    d('tried to req status for user that differs from ws ident (%s)', userID)
    return sendError(ws, 'Unauthorised')
  }

  const hosts = server.getHostsForUser(ws.userID)

  send(ws, ['status', hosts])
}

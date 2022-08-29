'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')

const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const { d, db } = server
  const { Credential } = db

  const [, authToken, mode] = msg
  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    mode: { type: 'string', v: mode }
  })
  if (!validRequest) {
    d('reset credentials: invalid request')
    return
  }
  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const [credentials] = await Credential.find([['mode', '=', mode]])

  if (credentials) {
    await Credential.rm(credentials.cid)
  }

  send(ws, ['data.api_credentials.reset', true])
}

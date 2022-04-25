'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const isAuthorized = require('../../../util/ws/is_authorized')
const validateParams = require('../../../util/ws/validate_params')
const featureFlags = require('../../../../config/feature_flags.json')

module.exports = async (server, ws, msg) => {
  const { d } = server
  const [, authToken] = msg

  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken }
  })

  if (!validRequest) {
    d('error: Invalid request params while fetching feature flags')
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  }

  send(ws, ['data.feature_flags', featureFlags])
}

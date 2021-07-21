'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const { d, db } = server
  const [, authToken, layouts] = msg
  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
  })

  if (!validRequest) {
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const { Layouts } = db
  await Layouts.set(layouts)

  d('Layouts have been saved')

  send(ws, ['data.layouts.saved', layouts])
}

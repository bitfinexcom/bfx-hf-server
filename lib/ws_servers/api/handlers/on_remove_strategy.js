'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const { notifyInternalError, notifySuccess } = require('../../../util/ws/notify')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const capture = require('../../../capture')

module.exports = async (server, ws, msg) => {
  const { d, db } = server
  const [, authToken, id] = msg
  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    id: { type: 'string', v: id }
  })

  if (!validRequest) {
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const { Strategy } = db
  try {
    await Strategy.rm(id)
    notifySuccess(ws, 'The strategy has been removed successfully')
  } catch (e) {
    capture.exception(e)
    notifyInternalError(ws)
    return
  }

  send(ws, ['data.strategy.removed', id])
  d('deleted strategy %s', id)
}

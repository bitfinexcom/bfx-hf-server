'use strict'

const capture = require('../../../../capture')
const send = require('../../../../util/ws/send')
const sendError = require('../../../../util/ws/send_error')
const isAuthorized = require('../../../../util/ws/is_authorized')
const validateParams = require('../../../../util/ws/validate_params')
const { notifyInternalError, notifySuccess } = require('../../../../util/ws/notify')

module.exports = async (server, ws, msg) => {
  const { d, db } = server
  const [, authToken, id] = msg

  const validRequest = validateParams(ws, {
    id: { type: 'string', v: id }
  })

  if (!validRequest) {
    d('error: Invalid request params while removing algo order parameters %s', id)
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const { AlgoOrderParams } = db
  try {
    await AlgoOrderParams.rm(id)
    notifySuccess(ws, 'Algo order parameter has been removed successfully')
  } catch (e) {
    capture.exception(e)
    notifyInternalError(ws)
    return
  }

  send(ws, ['data.algo_order_params.removed', id])
  d('deleted algo order params %s', id)
}

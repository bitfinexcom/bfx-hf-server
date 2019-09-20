'use strict'

const uuid = require('uuid/v4')
const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const { notifyInternalError } = require('../../../util/ws/notify')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const encryptStrategy = require('../../../util/encrypt_strategy')
const capture = require('../../../capture')

module.exports = async (server, ws, msg) => {
  const { d, db } = server
  const [, authToken, strategy] = msg
  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    strategy: { type: 'object', v: strategy }
  })

  if (!validRequest) {
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const { Strategy } = db
  const id = uuid()
  let encryptedStrategy

  console.log(id)

  try {
    encryptedStrategy = await encryptStrategy({ id, ...strategy }, ws.authPassword)
  } catch (e) {
    capture.exception(e)
    notifyInternalError(ws)
    return
  }

  await Strategy.set(encryptedStrategy)

  send(ws, ['data.strategy', id, { id, ...strategy }])
  d('saved strategy %s', id)
}

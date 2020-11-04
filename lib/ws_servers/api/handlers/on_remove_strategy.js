'use strict'

const PI = require('p-iteration')
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
  let strategiesByID

  try {
    strategiesByID = await Strategy.getAll()
  } catch (e) {
    capture.exception(e)
    notifyInternalError(ws)
    return
  }
  
  await PI.forEach(Object.values(strategiesByID), async (encryptedStrategy) => {
    const { id: encryptedStrategyId } = encryptedStrategy
    if (id === encryptedStrategyId) {
      await Strategy.rm(encryptedStrategy)
      notifySuccess(ws, 'The strategy successfully has been removed')
    }
  })


  send(ws, ['data.strategy.removed', id])
  d('deleted strategy %s', id)
}

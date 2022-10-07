'use strict'

const hash = require('../../../util/hash')
const validateParams = require('../../../util/ws/validate_params')
const { notifyError, notifyInternalError } = require('../../../util/ws/notify')
const verifyPassword = require('../../../util/verify_password')
const capture = require('../../../capture')

const sendStrategies = require('../send_strategies')

let authenticating = false

module.exports = async (server, ws, msg) => {
  if (authenticating) {
    return
  }
  if (ws.authPassword || ws.authControl) {
    return notifyError(ws, 'Already authenticated', ['alreadyAuthenticated'])
  }

  authenticating = true

  const { d, db } = server
  const [, password, mode] = msg
  const validRequest = validateParams(ws, {
    password: { type: 'string', v: password },
    mode: { type: 'string', v: mode }
  })

  if (!validRequest) {
    authenticating = false
    d('auth_submit: invalid request')
    return
  }

  const hashedPassword = hash(password)
  let authControl

  try {
    authControl = await verifyPassword(db, hashedPassword)

    if (!authControl) {
      authenticating = false
      return notifyError(ws, 'Invalid password', ['invalidPassword'])
    }
  } catch (e) {
    authenticating = false
    capture.exception(e)
    return notifyInternalError(ws)
  }

  d('identified')

  ws.authPassword = hashedPassword
  ws.authControl = authControl

  await sendStrategies(ws, db, d)

  ws.authPassword = null
  ws.authControl = null
  authenticating = false
}

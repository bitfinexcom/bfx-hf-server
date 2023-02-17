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

  authenticating = true

  const { sendDataToMetricsServer } = ws
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
      notifyError(ws, 'Invalid password', ['invalidPassword'])
      return sendDataToMetricsServer(['app_login_failed', '[on_decrypted_saved_strategies_request] Invalid password'])
    }
  } catch (e) {
    authenticating = false
    capture.exception(e)
    notifyInternalError(ws)
    return sendDataToMetricsServer(['app_login_failed', e.stack])
  }

  d('identified')

  ws.authPassword = hashedPassword
  ws.authControl = authControl

  await sendStrategies(ws, db, d)

  ws.authPassword = null
  ws.authControl = null
  authenticating = false
}

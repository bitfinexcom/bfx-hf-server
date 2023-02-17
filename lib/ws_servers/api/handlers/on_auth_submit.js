'use strict'

const hash = require('../../../util/hash')
const validateParams = require('../../../util/ws/validate_params')
const { notifyError, notifyInternalError } = require('../../../util/ws/notify')
const verifyPassword = require('../../../util/verify_password')
const capture = require('../../../capture')

const validateModes = require('../validate_modes')
const sendStrategies = require('../send_strategies')
const sendAuthenticated = require('../send_authenticated')

let authenticating = false

module.exports = async (server, ws, msg) => {
  if (authenticating) {
    return
  }
  if (ws.authPassword || ws.authControl) {
    return notifyError(ws, 'Already authenticated', ['alreadyAuthenticated'])
  }

  authenticating = true

  const { sendDataToMetricsServer } = ws
  const { d, db, restURL } = server
  const [, password, mode, dmsScope] = msg
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
      return sendDataToMetricsServer(['app_login_failed', '[on_auth_submit] Invalid password'])
    }
  } catch (e) {
    authenticating = false
    capture.exception(e)
    notifyInternalError(ws)
    return sendDataToMetricsServer(['app_login_failed', e.stack])
  }

  ws.authPassword = hashedPassword
  ws.authControl = authControl

  d('identified')

  await validateModes(ws, db, { restURL })
  await sendAuthenticated(server, ws, { mode, dmsScope })
  await sendStrategies(ws, db, d)
  authenticating = false
}

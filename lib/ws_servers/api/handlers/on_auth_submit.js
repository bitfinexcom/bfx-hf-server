'use strict'

const hash = require('../../../util/hash')
const validateParams = require('../../../util/ws/validate_params')
const { notifyError, notifyInternalError } = require('../../../util/ws/notify')
const verifyPassword = require('../../../util/verify_password')
const capture = require('../../../capture')

const sendStrategies = require('../send_strategies')
const sendAuthenticated = require('../send_authenticated')

module.exports = async (server, ws, msg) => {
  if (ws.authPassword || ws.authControl) {
    return notifyError(ws, 'Already authenticated')
  }

  const { d, db, wsURL, restURL } = server
  const [, password] = msg
  const validRequest = validateParams(ws, {
    password: { type: 'string', v: password }
  })

  if (!validRequest) {
    return
  }

  const hashedPassword = hash(password)
  let authControl

  try {
    authControl = await verifyPassword(db, hashedPassword)

    if (!authControl) {
      return notifyError(ws, 'Invalid password')
    }
  } catch (e) {
    capture.exception(e)
    return notifyInternalError(ws)
  }

  ws.authPassword = hashedPassword
  ws.authControl = authControl

  d('identified')

  ws.aoc = server.openAlgoServerClient()
  ws.aoc.identify(ws, authControl)

  await sendAuthenticated(ws, db, d, { wsURL, restURL })
  await sendStrategies(ws, db, d)
}

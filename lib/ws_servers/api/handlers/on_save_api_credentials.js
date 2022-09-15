'use strict'

const _capitalize = require('lodash/capitalize')

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const {
  notifyInternalError, notifySuccess, notifyError
} = require('../../../util/ws/notify')

const verifyPassword = require('../../../util/verify_password')
const encryptAPICredentials = require('../../../util/encrypt_api_credentials')
const isAuthorized = require('../../../util/ws/is_authorized')
const capture = require('../../../capture')
const validateModes = require('../validate_modes')
const connManager = require('../start_connections')

const exID = 'bitfinex' // legacy support

module.exports = async (server, ws, msg) => {
  const { d, db, restURL } = server
  const [, authToken, apiKey, apiSecret, formSent, mode, dmsScope] = msg
  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    apiKey: { type: 'string', v: apiKey },
    apiSecret: { type: 'string', v: apiSecret },
    formSent: { type: 'string', v: formSent },
    mode: { type: 'string', v: mode }
  })

  if (!validRequest) {
    d('save credentials: invalid request')
    return
  } else if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  // TODO: Move into isAuthorized()
  let authControl

  try {
    authControl = await verifyPassword(db, ws.authPassword)

    if (!authControl || ws.authControl !== authControl) {
      return notifyError(ws, 'Invalid password', ['invalidPassword'])
    }
  } catch (e) {
    capture.exception(e)
    return notifyInternalError(ws)
  }

  const { Credential } = db
  const credentials = await encryptAPICredentials({
    exID: exID + formSent,
    password: ws.authPassword,
    key: apiKey,
    secret: apiSecret,
    mode: formSent
  })

  await Credential.set(credentials)

  d('saved API credentials for Bitfinex')

  await validateModes(ws, db, { restURL })
  notifySuccess(ws, `Encrypted API credentials saved for ${_capitalize(exID)}`, ['encryptedApiCredentialsSavedFor', { target: _capitalize(exID) }])
  send(ws, ['data.api_credentials.configured', exID])

  d('issuing API & Algo reconnect due to credentials change')

  ws.authenticateSession({
    apiKey,
    apiSecret,
    mode,
    dmsScope
  })

  notifySuccess(ws, 'Reconnecting with new credentials...', ['reconnectingWithNewCredentials'])

  await ws.closeMode(mode)
  await connManager.start(server, ws)
}

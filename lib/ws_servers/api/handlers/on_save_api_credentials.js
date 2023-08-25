'use strict'

const _capitalize = require('lodash/capitalize')

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const {
  notifyInternalError, notifySuccess, notifyError
} = require('../../../util/ws/notify')

const { verifyCredentialAccount } = require('../../../util/validate_credentials')
const verifyPassword = require('../../../util/verify_password')
const encryptAPICredentials = require('../../../util/encrypt_api_credentials')
const isAuthorized = require('../../../util/ws/is_authorized')
const capture = require('../../../capture')
const validateModes = require('../validate_modes')
const connManager = require('../start_connections')

const exID = 'bitfinex' // legacy support

module.exports = async (server, ws, msg) => {
  const { sendDataToMetricsServer } = ws
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
      notifyError(ws, 'Invalid password', ['invalidPassword'])
      return sendDataToMetricsServer(['app_login_failed', '[on_save_api_credentials] Invalid password'])
    }
  } catch (e) {
    capture.exception(e)
    notifyInternalError(ws)
    return sendDataToMetricsServer(['app_login_failed', e.stack])
  }

  if (formSent) {
    try {
      const isValidAccount = await verifyCredentialAccount(apiKey, apiSecret, restURL, formSent)
      if (!isValidAccount) {
        return send(ws, ['data.api_credentials.validation', {
          [formSent]: { configured: true, valid: false }
        }])
      }
    } catch (e) {
      send(ws, ['data.api_credentials.validation', {
        [formSent]: { configured: true, valid: false }
      }])
      throw e
    }
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

  const algoWorker = ws.getAlgoWorker() // can return null
  if (algoWorker) {
    await algoWorker.closeActiveAlgosOnHost()
  }

  await ws.closeMode(formSent)

  if (formSent === mode) {
    notifySuccess(ws, 'Reconnecting with new credentials...', ['reconnectingWithNewCredentials'])

    ws.authenticateSession({ mode, dmsScope, apiKey, apiSecret })
    await connManager.start(server, ws)
  } else {
    ws.setCredentialsForMode(formSent, apiKey, apiSecret)
  }
}

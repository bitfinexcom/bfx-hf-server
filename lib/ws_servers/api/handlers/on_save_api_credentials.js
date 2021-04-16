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
const openAuthBitfinexConnection = require('../open_auth_bitfinex_connection')

module.exports = async (server, ws, msg) => {
  const { d, db, wsURL, restURL } = server
  const [, authToken, apiKey, apiSecret, formSent, mode] = msg
  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    apiKey: { type: 'string', v: apiKey },
    apiSecret: { type: 'string', v: apiSecret },
    formSent: { type: 'string', v: formSent },
    mode: { type: 'string', v: mode }
  })

  const exID = 'bitfinex' // legacy support

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
      return notifyError(ws, 'Invalid password')
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

  notifySuccess(ws, `Encrypted API credentials saved for ${_capitalize(exID)}`)
  send(ws, ['data.api_credentials.configured', exID])

  if (formSent !== mode) {
    return
  }

  ws[`${exID}Credentials`] = {
    key: apiKey,
    secret: apiSecret
  }

  d('issuing API & Algo reconnect due to credentials change')

  if (ws.clients.bitfinex) {
    ws.clients.bitfinex.setAuthArgs({
      apiKey,
      apiSecret
    })
  }

  ws.aoc.reconnect()
  Object.values(ws.clients).forEach(ex => ex.reconnect())

  notifySuccess(ws, 'Reconnecting with new credentials...')

  // Open algo host if needed
  const isHostOpen = await ws.aoc.isHostOpen(exID)

  if (isHostOpen) {
    return
  }

  const opts = { wsURL, restURL }
  ws.aoc.openHost('bitfinex', apiKey, apiSecret)
  ws.clients.bitfinex = await openAuthBitfinexConnection({ ws, apiKey, apiSecret, db, d, opts })
}

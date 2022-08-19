'use strict'

const send = require('../../util/ws/send')
const sendError = require('../../util/ws/send_error')
const { notifySuccess } = require('../../util/ws/notify')
const decryptAPICredentials = require('../../util/decrypt_api_credentials')
const connectionManager = require('./start_connections')
const reduceMarketData = require('../../util/reduce_market_data')

module.exports = async (server, ws, opts) => {
  const { d, db, marketData } = server
  const { authPassword, authControl } = ws
  const { mode, dmsScope } = opts

  const markets = reduceMarketData(marketData)

  send(ws, ['info.markets', 'bitfinex', markets])

  if (!authPassword || !authControl) {
    return sendError(ws, 'Not authenticated')
  }

  // Grab all exchange API credentials
  const { Credential } = db
  const [credentials] = await Credential.find([['mode', '=', mode]])

  // Send basic auth data for further requests
  send(ws, ['info.auth_token', authControl, mode])
  notifySuccess(ws, 'Authenticated', ['authenticated'])

  if (!credentials) {
    ws.mode = mode
    return
  }

  const cleartext = await decryptAPICredentials({
    password: authPassword,
    credentials
  })

  if (!cleartext) {
    d('found stored credential encrypted with invalid password, deleting...')
    await Credential.rm(credentials)
    return
  }

  const { key, secret } = cleartext

  ws.authenticateSession({
    apiKey: key,
    apiSecret: secret,
    mode,
    dmsScope
  })

  notifySuccess(ws, `Decrypted credentials for bitfinex (${mode})`, ['decryptedCredentialsFor', {
    target: 'Bitfinex',
    mode
  }])
  send(ws, ['data.api_credentials.configured', 'bitfinex'])

  await connectionManager.start(server, ws)
}

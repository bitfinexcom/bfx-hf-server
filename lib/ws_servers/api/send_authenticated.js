'use strict'

const send = require('../../util/ws/send')
const sendError = require('../../util/ws/send_error')
const { notifySuccess } = require('../../util/ws/notify')
const filterMarketData = require('../../util/filter_market_data')
const decryptAPICredentials = require('../../util/decrypt_api_credentials')
const connManager = require('./start_connections')
const { PAPER_MODE_PAIRS } = require('../../constants')

module.exports = async (ws, db, marketData, d, opts) => {
  const { authPassword, authControl } = ws
  const { mode, wsURL, restURL, hostedURL, dmsScope } = opts

  const isPaper = mode === 'paper'

  const markets = filterMarketData(marketData, (m) => {
    if (isPaper) {
      return PAPER_MODE_PAIRS.includes(m.wsID)
    }
    return m.p === 0
  })

  send(ws, ['info.markets', 'bitfinex', markets])

  if (!authPassword || !authControl) {
    return sendError(ws, 'Not authenticated')
  }

  // Send basic auth data for further requests
  send(ws, ['info.auth_token', authControl])
  notifySuccess(ws, 'Authenticated', ['authenticated'])

  // Grab all exchange API credentials
  const { Credential } = db
  const [credentials] = await Credential.find([['mode', '=', mode]])

  if (!credentials) {
    send(ws, ['info.auth_api_key', false, mode])
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

  ws.bitfinexCredentials = { key, secret }
  ws.mode = mode
  ws.isPaper = isPaper
  notifySuccess(ws, `Decrypted credentials for bitfinex (${mode})`, ['decryptedCredentialsFor', {
    target: 'Bitfinex',
    mode
  }])
  send(ws, ['data.api_credentials.configured', 'bitfinex'])

  await connManager.start({
    ws,
    db,
    d,
    apiKey: key,
    apiSecret: secret,
    wsURL,
    restURL,
    hostedURL,
    dmsScope,
    isPaper
  })
}

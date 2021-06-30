'use strict'

const send = require('../../util/ws/send')
const sendError = require('../../util/ws/send_error')
const { notifySuccess } = require('../../util/ws/notify')
const filterMarketData = require('../../util/filter_market_data')
const decryptAPICredentials = require('../../util/decrypt_api_credentials')
const openAuthBitfinexConnection = require('./open_auth_bitfinex_connection')
const { DEFAULT_USER } = require('../../constants')

module.exports = async (ws, db, marketData, d, opts) => {
  const { authPassword, authControl } = ws
  const { mode } = opts

  const isPaper = mode === 'paper' ? 1 : 0

  const markets = filterMarketData(marketData, m => m.p === isPaper)

  send(ws, ['info.markets', 'bitfinex', markets])

  if (!authPassword || !authControl) {
    return sendError(ws, 'Not authenticated')
  }

  // Send basic auth data for further requests
  send(ws, ['info.auth_token', authControl])
  notifySuccess(ws, 'Authenticated')

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
  notifySuccess(ws, `Decrypted credentials for bitfinex (${mode})`)
  send(ws, ['data.api_credentials.configured', 'bitfinex'])

  ws.algoWorker.start({ apiKey: key, apiSecret: secret, userId: DEFAULT_USER })
  ws.clients.bitfinex = await openAuthBitfinexConnection({ ws, apiKey: key, apiSecret: secret, db, d, opts })
}

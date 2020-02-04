'use strict'

const PI = require('p-iteration')
const send = require('../../util/ws/send')
const sendError = require('../../util/ws/send_error')
const { notifySuccess, notifyInternalError } = require('../../util/ws/notify')
const decryptAPICredentials = require('../../util/decrypt_api_credentials')
const { CREDENTIALS_CID } = require('../../db/credentials')
const openAuthBitfinexConnection = require('./open_auth_bitfinex_connection')
const openAuthBinanceConnection = require('./open_auth_binance_connection')

module.exports = async (ws, db, d) => {
  const { authPassword, authControl } = ws

  if (!authPassword || !authControl) {
    return sendError(ws, 'Not authenticated')
  }

  // Send basic auth data for further requests
  send(ws, ['info.auth_confgured', true])
  send(ws, ['info.auth_token', authControl])
  notifySuccess(ws, 'Authenticated')

  // Grab all exchange API credentials
  const { Credential } = db
  const allCredentials = await Credential.getAll()
  const apiCredentials = Object
    .values(allCredentials)
    .filter(c => c.cid !== CREDENTIALS_CID)

  // Attempt to decrypt & open connections for all valid credentials
  await PI.forEach(apiCredentials, async (credentials) => {
    const cleartext = await decryptAPICredentials({
      password: authPassword,
      credentials
    })

    if (!cleartext) {
      d('found stored credential encrypted with invalid password, deleting...')
      await Credential.rm(credentials)
      return
    }

    const { exID, key, secret } = cleartext

    ws[`${exID}Credentials`] = { key, secret }
    notifySuccess(ws, `Decrypted credentials for ${exID}`)
    send(ws, ['data.api_credentials.configured', exID])

    switch (exID) {
      case 'bitfinex': {
        ws.aoc.openHost('bitfinex', key, secret)
        ws.clients.bitfinex = await openAuthBitfinexConnection(ws, key, secret, db, d)
        break
      }

      case 'binance': {
        ws.aoc.openHost('binance', key, secret)
        ws.clients.binance = openAuthBinanceConnection(ws, key, secret)
        break
      }

      default: {
        d('unknown exID broke through: %s', exID)
        notifyInternalError(ws)
        break
      }
    }
  })
}

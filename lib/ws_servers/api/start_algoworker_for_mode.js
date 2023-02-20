'use strict'

const decryptAPICredentials = require('../../util/decrypt_api_credentials')
const connectionManager = require('./start_connections')

module.exports = async (server, ws, opts) => {
  const { d, db } = server
  const { authPassword, authControl } = ws
  const { mode, dmsScope } = opts

  if (!authPassword || !authControl) {
    return d('Not authenticated')
  }

  // Grab all exchange API credentials
  const { Credential } = db
  const [credentials] = await Credential.find([['mode', '=', mode]])

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

  await connectionManager.start(server, ws)
}

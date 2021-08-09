'use strict'

const send = require('../../util/ws/send')
const validateCredentials = require('../../util/validate_credentials')

async function getCredentials (db, mode) {
  const { Credential } = db
  const [credentials] = await Credential.find([['mode', '=', mode]])

  return credentials
}

async function getCredentialsState (db, mode, authPassword) {
  const credentials = await getCredentials(db, mode)

  return {
    configured: Boolean(credentials),
    valid: await validateCredentials(credentials, authPassword)
  }
}

module.exports = async (ws, db) => {
  const { authPassword } = ws

  const [mainValid, paperValid] = await Promise.all([
    getCredentialsState(db, 'main', authPassword),
    getCredentialsState(db, 'paper', authPassword)
  ])

  send(ws, ['data.api_credentials.validation', {
    main: mainValid,
    paper: paperValid
  }])
}

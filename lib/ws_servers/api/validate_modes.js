'use strict'

const { RESTv2 } = require('bfx-api-node-rest')
const send = require('../../util/ws/send')
const decryptAPICredentials = require('../../util/decrypt_api_credentials')

async function validateKeys (url, apiKey, apiSecret) {
  const rest = new RESTv2({
    url,
    apiKey,
    apiSecret,
    transform: true
  })

  try {
    await rest.userInfo()
    return true
  } catch (e) {
    const isKeyInvalid = e.error[2].match(/apikey:.*invalid/)

    if (isKeyInvalid) return false
    throw e
  }
}

async function validateCredentials (db, authPassword, mode) {
  const { Credential } = db
  const [credentials] = await Credential.find([['mode', '=', mode]])

  if (!credentials) {
    return false
  }

  const { key, secret } = await decryptAPICredentials({
    password: authPassword,
    credentials
  })

  return validateKeys(null, key, secret)
}

module.exports = async (ws, db) => {
  const { authPassword } = ws

  send(ws, ['data.api_credentials.validation', {
    main: await validateCredentials(db, authPassword, 'main'),
    paper: await validateCredentials(db, authPassword, 'paper')
  }])
}

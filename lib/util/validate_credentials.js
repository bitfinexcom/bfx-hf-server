'use strict'

const { RESTv2 } = require('bfx-api-node-rest')
const decryptAPICredentials = require('./decrypt_api_credentials')

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

async function validateCredentials (credentials, authPassword) {
  if (!credentials) {
    return false
  }

  const { key, secret } = await decryptAPICredentials({
    password: authPassword,
    credentials
  })

  return validateKeys(null, key, secret)
}

module.exports = validateCredentials

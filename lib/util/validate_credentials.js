'use strict'

const { RESTv2 } = require('bfx-api-node-rest')
const _get = require('lodash/get')
const decryptAPICredentials = require('./decrypt_api_credentials')

const requiredPermissions = Object.freeze({
  'orders.read': 'Get orders and statuses',
  'orders.write': 'Create and cancel orders',
  'wallets.read': 'Get wallet balances and addresses'
})

/**
 * @param {Object} caps
 * @returns {boolean}
 */
const hasRequiredPermissions = (caps) => {
  return Object.keys(requiredPermissions)
    .every(perm => _get(caps, perm))
}

const mapPermissions = (permissions) => {
  return Object.fromEntries(
    permissions.map(({ key, read, write }) => [key, { read, write }])
  )
}

const checkErr = (err, pattern) => {
  return Array.isArray(err.error) &&
    typeof err.error[2] === 'string' &&
    err.error[2].match(pattern)
}

async function validateKeys (rest) {
  try {
    const permissions = await rest.keyPermissions()
    return hasRequiredPermissions(mapPermissions(permissions))
  } catch (e) {
    const isKeyInvalid = checkErr(e, /apikey:.*invalid/)
    if (isKeyInvalid) return false

    throw e
  }
}

async function verifyCredentialAccount (apiKey, apiSecret, restURL, formSent) {
  const rest = new RESTv2({
    url: restURL,
    apiKey,
    apiSecret,
    transform: true
  })

  try {
    const { isPaperTradeEnabled } = await rest.userInfo()
    return (formSent === 'main' && isPaperTradeEnabled !== 1) || (formSent === 'paper' && isPaperTradeEnabled === 1)
  } catch (e) {
    const isKeyInvalid = checkErr(e, /apikey:.*invalid/)
    if (isKeyInvalid) return false

    throw e
  }
}

async function validateCredentials (credentials, authPassword, { restURL = null } = {}) {
  if (!credentials) {
    return false
  }

  const { key, secret } = await decryptAPICredentials({
    password: authPassword,
    credentials
  })

  const rest = new RESTv2({
    url: restURL,
    apiKey: key,
    apiSecret: secret,
    transform: true
  })

  return validateKeys(rest)
}

module.exports = {
  requiredPermissions,
  validateKeys,
  validateCredentials,
  hasRequiredPermissions,
  verifyCredentialAccount
}

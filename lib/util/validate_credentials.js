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

async function validateKeys (url, apiKey, apiSecret) {
  const rest = new RESTv2({
    url,
    apiKey,
    apiSecret,
    transform: true
  })

  try {
    const permissions = await rest.keyPermissions()
    return hasRequiredPermissions(mapPermissions(permissions))
  } catch (e) {
    const isKeyInvalid = e.error[2].match(/apikey:.*invalid/)

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

  return validateKeys(restURL, key, secret)
}

module.exports = {
  requiredPermissions,
  validateKeys,
  validateCredentials,
  hasRequiredPermissions
}

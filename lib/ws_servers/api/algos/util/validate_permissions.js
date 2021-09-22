'use strict'

const _get = require('lodash/get')
const requiredPermissions = [
  'orders.read',
  'orders.write',
  'wallets.read'
]

/**
 * @param {Object} caps
 * @returns {boolean}
 */
module.exports.hasRequiredPermissions = (caps) => {
  return requiredPermissions.every(perm => _get(caps, perm))
}

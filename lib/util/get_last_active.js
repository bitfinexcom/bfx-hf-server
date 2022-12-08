'use strict'

const _ = require('lodash')
const { RESTv2 } = require('bfx-api-node-rest')

/**
 * @param {number | string} gId
 * @param {any[]} orders
 * @returns {number}
 */
const getLastActive = (gId, orders) => {
  const lastUpdate = _.maxBy(orders, (o) => {
    return _.toString(o.gid) === _.toString(gId) ? o.mtsUpdate : 0
  })

  return lastUpdate ? lastUpdate.mtsUpdate : 0
}

/**
 *
 * @param {string} restURL
 * @param {string} apiKey
 * @param {string} apiSecret
 * @returns {Promise<object[]>}
 */
const getOrderHistory = async (restURL, apiKey, apiSecret) => {
  const rest = new RESTv2({
    transform: true,
    url: restURL,
    apiKey: apiKey,
    apiSecret: apiSecret
  })
  return await rest.orderHistory()
}

module.exports = {
  getLastActive,
  getOrderHistory
}

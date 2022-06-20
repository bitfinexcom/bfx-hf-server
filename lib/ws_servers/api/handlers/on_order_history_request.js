'use strict'

const { RESTv2 } = require('bfx-api-node-rest')

const _omit = require('lodash/omit')
const _isString = require('lodash/isString')
const _isInteger = require('lodash/isInteger')
const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const isAuthorized = require('../../../util/ws/is_authorized')
const { orderHasValidPair } = require('../paper_filters')

const omitFields = ['_apiInterface', '_boolFields', '_events', '_eventsCount', '_fields']

const filterOrdersByScope = (dmsScope = 'app') => {
  return (order) => {
    if (!order.meta) {
      return false
    }

    return order.meta.scope === dmsScope || (dmsScope === 'app' && order.meta._HF)
  }
}

const validateOptions = ({ authToken, start, end, limit, symbol }) => {
  if (authToken && !_isString(authToken)) {
    throw new Error('invalid authToken')
  }
  if (symbol && !_isString(symbol)) {
    throw new Error('invalid symbol')
  }
  if (start && !_isInteger(start)) {
    throw new Error('invalid start timestamp')
  }
  if (end && !_isInteger(end)) {
    throw new Error('invalid end timestamp')
  }
  if (limit && !_isInteger(limit)) {
    throw new Error('invalid limit')
  }
}

const getOrderHistory = async (rest, opts) => {
  validateOptions(opts)

  const { symbol, start, end, limit, isPaper, dmsScope } = opts
  const orders = await rest.orderHistory(symbol, start, end, limit)

  return orders
    .filter(filterOrdersByScope(dmsScope))
    .filter((order) => orderHasValidPair(isPaper, order))
    .map(hist => _omit(hist, omitFields))
}

module.exports = async (server, ws, msg) => {
  const { restURL, d } = server
  const { isPaper, bitfinexCredentials = {} } = ws
  const { key: apiKey, secret: apiSecret } = bitfinexCredentials
  const [, authToken, start = null, end = null, limit = 500, symbol = null] = msg

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  }

  const rest = new RESTv2({
    transform: true,
    url: restURL,
    apiKey: apiKey,
    apiSecret: apiSecret
  })

  try {
    const orders = await getOrderHistory(rest, { symbol, start, end, limit, isPaper, dmsScope: 'app' })
    send(ws, ['data.order_history', orders])
  } catch (err) {
    d('invalid request: order_history_request')
    sendError(ws, err.message)
  }
}

module.exports.getOrderHistory = getOrderHistory

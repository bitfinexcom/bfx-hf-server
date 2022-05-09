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

const filterOrdersByScope = (scope = 'app') => {
  return (order) => {
    if (!order.meta) {
      return false
    }

    return order.meta.scope === scope || (scope === 'app' && order.meta._HF)
  }
}

const getOrderHistory = async ({ rest, symbol, start, end, limit, isPaper, scope }) => {
  const orders = await rest.orderHistory(symbol, start, end, limit)

  return orders
    .filter(filterOrdersByScope(scope))
    .filter((order) => orderHasValidPair(isPaper, order))
    .map(hist => _omit(hist, omitFields))
}

const orderHistoryOptsValidator = ({ authToken, start, end, limit, symbol }) => {
  if (authToken && !_isString(authToken)) {
    return 'invalid authToken'
  } else if (symbol && !_isString(symbol)) {
    return 'invalid symbol'
  } else if (start && !_isInteger(start)) {
    return 'invalid start timestamp'
  } else if (end && !_isInteger(end)) {
    return 'invalid end timestamp'
  } else if (limit && !_isInteger(limit)) {
    return 'invalid limit'
  }

  return null
}

module.exports = async (server, ws, msg) => {
  const { restURL, d } = server
  const { isPaper, bitfinexCredentials = {} } = ws
  const { key: apiKey, secret: apiSecret } = bitfinexCredentials
  const [, authToken, start = null, end = null, limit = 500, symbol = null] = msg

  const err = orderHistoryOptsValidator({ authToken, start, end, limit, symbol })

  if (err) {
    d('invalid request: order_history_request')
    return sendError(ws, err)
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  }

  const rest = new RESTv2({
    transform: true,
    url: restURL,
    apiKey: apiKey,
    apiSecret: apiSecret
  })

  const orders = await getOrderHistory({ rest, symbol, start, end, limit, isPaper, scope: 'app' })
  send(ws, ['data.order_history', orders])
}

module.exports.getOrderHistory = getOrderHistory

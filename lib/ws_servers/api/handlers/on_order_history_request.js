'use strict'

const { RESTv2 } = require('bfx-api-node-rest')

const _omit = require('lodash/omit')
const _isString = require('lodash/isString')
const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const isAuthorized = require('../../../util/ws/is_authorized')
const validateParams = require('../../../util/ws/validate_params')

const omitFields = ['_apiInterface', '_boolFields', '_events', '_eventsCount', '_fields']

module.exports = async (server, ws, msg) => {
  const { restURL, d } = server
  const { bitfinexCredentials = {} } = ws
  const { key: apiKey, secret: apiSecret } = bitfinexCredentials
  const [, authToken, start, end, limit, symbol = null] = msg

  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    start: { type: 'number', v: start },
    end: { type: 'number', v: end },
    limit: { type: 'number', v: limit }
  })

  if (!validRequest || (symbol && !_isString(symbol))) {
    d('invalid request: order_history_request')
    return
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

  const orders = await rest.orderHistory(symbol, start, end, limit)

  send(ws, [
    'data.order_history',
    orders
      .filter(hist => hist.meta && (hist.meta.scope === 'app' || hist.meta._HF))
      .map(hist => _omit(hist, omitFields))
  ])
}

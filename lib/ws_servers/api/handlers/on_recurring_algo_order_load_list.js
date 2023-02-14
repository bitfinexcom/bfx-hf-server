'use strict'

const { RESTv2 } = require('bfx-api-node-rest')
const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const mapRecurringAlgoOrderState = require('../../../util/map_recurring_ao_state')

/**
 * Get all recurring algo order list
 *
 * @param {RESTv2} rest
 * @returns {Promise} p
 */
const _getAllRecurringAlgoOrderList = async (rest) => {
  let page = 1
  let algoOrders = []

  while (true) {
    const payload = { page, limit: 50, status: 'active' }
    const result = await rest.getRecurringAlgoOrders(payload)
    if (!result || result.items) break

    const { items } = result
    algoOrders = algoOrders.concat(items)

    if (items.length < 100) break

    page += 1
  }

  return algoOrders.map(mapRecurringAlgoOrderState)
}

module.exports = async (server, ws, msg) => {
  const { d, restURL } = server
  const [, authToken, mode] = msg
  const { apiKey, apiSecret } = ws.getCredentials()
  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    mode: { type: 'string', v: mode }
  })

  if (!validRequest) {
    return send(ws, ['data.recurring_algo_order.load_status', 'Invalid request'])
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

  try {
    const algoOrders = await _getAllRecurringAlgoOrderList(rest)
    send(ws, ['data.recurring_ao_list', mode, algoOrders])
  } catch (e) {
    d('error loading recurring AO %s', e.stack)
    return sendError(ws, e.message, e.i18n)
  }
}

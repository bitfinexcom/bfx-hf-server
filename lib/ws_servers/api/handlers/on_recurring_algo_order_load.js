'use strict'

const { RESTv2 } = require('bfx-api-node-rest')
const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const { Recurring } = require('bfx-hf-algo')

/**
 * Get recurring algo order
 *
 * @param {RESTv2} rest
 * @param {object} algoDB
 * @param {string} recurringAlgoOrderId
 * @param {string} gid
 */
const getRecurringAlgoOrder = async (rest, algoDB, recurringAlgoOrderId, gid) => {
  const { AlgoOrder } = algoDB
  const { state = '{}' } = await AlgoOrder.get({ gid, algoID: Recurring.id })
  const { args = {}, label, name } = JSON.parse(state)

  const { alias, createdAt } = await rest.getRecurringAlgoOrder(recurringAlgoOrderId)

  return {
    id: Recurring.id,
    gid,
    alias,
    name,
    args,
    label,
    createdAt: new Date(createdAt).getTime(),
    lastActive: new Date().getTime()
  }
}

module.exports = async (server, ws, msg) => {
  const { d, restURL, algoDB } = server
  const { mode } = ws
  const [, authToken, recurringAlgoOrderId, gid] = msg
  const { apiKey, apiSecret } = ws.getCredentials()
  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    algoOrderId: { type: 'string', v: recurringAlgoOrderId },
    gid: { type: 'string', v: gid }
  })

  if (!validRequest) {
    d('invalid request: algo:load')
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

  try {
    const data = await getRecurringAlgoOrder(rest, algoDB, recurringAlgoOrderId, gid)
    send(ws, ['algo.order_loaded', gid])
    send(ws, ['data.ao', 'bitfinex', mode, data])
  } catch (e) {
    d('error loading recurring AO %s: %s', recurringAlgoOrderId, e.stack)
    sendError(ws, e.message, e.i18n)
  }
}

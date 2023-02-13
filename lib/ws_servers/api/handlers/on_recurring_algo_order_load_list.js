'use strict'

const { RESTv2 } = require('bfx-api-node-rest')
const { Recurring } = require('bfx-hf-algo')
const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const isPaperMode = require('../../../util/is_paper_mode')

/**
 * Get all recurring algo order list
 *
 * @param {RESTv2} rest
 * @param {'paper' | 'main'} mode
 * @returns {Promise} p
 */
const getAllRecurringAlgoOrderList = async (rest, mode) => {
  let page = 1
  let algoOrders = []

  const paperMode = mode === 'paper'

  while (true) {
    const payload = { page, limit: 50, status: 'active' }
    const result = await rest.getRecurringAlgoOrders(payload)
    if (!result || result.items) break

    const { items } = result
    algoOrders = algoOrders.concat(items)

    if (items.length < 100) break

    page += 1
  }

  return algoOrders.filter((ao) => isPaperMode(ao._symbol) === paperMode).map(_mapAlgoOrder)
}

const _mapAlgoOrder = (recurringAO) => {
  const algoID = Recurring.id
  const createdAt = new Date(recurringAO.createdAt).getTime()

  const algoOrder = {
    recurringAlgoOrderId: recurringAO._id,
    gid: recurringAO.gid.toString(),
    alias: recurringAO.alias || Recurring.name,
    createdAt,
    algoID,
    state: {
      name: Recurring.name,
      args: {
        meta: { ...(recurringAO.scope ? { scope: recurringAO.scope } : {}), algoOrderId: algoID },
        symbol: recurringAO._symbol,
        currency: recurringAO.currency,
        amount: recurringAO.amount,
        action: recurringAO.action,
        recurrence: recurringAO.recurrence,
        startedAt: new Date(recurringAO.startedAt),
        endless: recurringAO.endless,
        ...(recurringAO.endedAt
          ? { endedAt: new Date(recurringAO.endedAt) }
          : {})
      }
    },
    active: recurringAO.status === 'active',
    lastActive: createdAt
  }

  algoOrder.state.label = Recurring.meta.genOrderLabel(algoOrder.state)
  return algoOrder
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
    const algoOrders = await getAllRecurringAlgoOrderList(rest, mode)
    send(ws, ['data.recurring_ao_list', mode, algoOrders])
  } catch (e) {
    d('error loading recurring AO %s', e.stack)
    return sendError(ws, e.message, e.i18n)
  }
}

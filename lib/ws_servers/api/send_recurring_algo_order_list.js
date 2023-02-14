'use strict'

const { RESTv2 } = require('bfx-api-node-rest')
const send = require('../../util/ws/send')
const sendError = require('../../util/ws/send_error')
const mapRecurringAlgoOrderState = require('../../util/map_recurring_ao_state')

/**
 * Get all recurring algo order list
 *
 * @param {RESTv2} rest
 * @returns {Promise} p
 */
const getAndUpdateRecurringAlgoOrdersList = async (rest, algoDB) => {
  let page = 1
  let algoOrders = []

  while (true) {
    const payload = { page, limit: 50, status: 'active' }
    const result = await rest.getRecurringAlgoOrders(payload)
    if (!result || !result.items) break

    const { items } = result
    algoOrders = algoOrders.concat(items)

    if (items.length < 100) break

    page += 1
  }

  const { AlgoOrder } = algoDB

  return algoOrders.map((ao) => {
    const mappedRecurringAO = mapRecurringAlgoOrderState(ao)

    AlgoOrder.set({ ...mappedRecurringAO, state: JSON.stringify(mappedRecurringAO.state) })

    const {
      alias,
      createdAt,
      lastActive,
      algoID,
      gid,
      state: { args, label, name }
    } = mappedRecurringAO

    return {
      id: algoID,
      label,
      gid,
      alias,
      name,
      args,
      createdAt,
      lastActive
    }
  })
}

module.exports = async (server, ws, mode) => {
  const { d, restURL, algoDB } = server
  const { apiKey, apiSecret } = ws.getCredentials()

  if (!apiKey || !apiSecret) {
    return
  }

  const rest = new RESTv2({
    transform: true,
    url: restURL,
    apiKey: apiKey,
    apiSecret: apiSecret
  })

  try {
    const algoOrders = await getAndUpdateRecurringAlgoOrdersList(rest, algoDB)
    send(ws, ['data.recurring_ao_list', mode, algoOrders])
  } catch (e) {
    d('error loading recurring AO %s', e.stack)
    return sendError(ws, e.message, e.i18n)
  }
}

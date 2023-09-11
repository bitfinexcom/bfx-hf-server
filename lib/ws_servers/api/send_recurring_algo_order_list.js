'use strict'

const { RESTv2 } = require('bfx-api-node-rest')
const send = require('../../util/ws/send')
const sendError = require('../../util/ws/send_error')
const mapRecurringAlgoOrderState = require('../../util/map_recurring_ao_state')
const restPaginationHandler = require('../../util/rest_pagination_handler')

const getRecurringAosWithRetry = async (rest, debug) => {
  let algoOrders = []
  let retries = 0
  let err = null
  while (retries < 3) {
    try {
      algoOrders = await restPaginationHandler(rest.getRecurringAlgoOrders.bind(rest), {})
      debug('fetched total Recurring AOs', algoOrders.length)
      return algoOrders
    } catch (e) {
      debug('error fetching Recurring AOs', e)
      err = e
      retries++
    }
  }
  if (err) throw err

  return algoOrders
}

/**
 * Get all recurring algo order list
 *
 * @param {RESTv2} rest
 * @param {HFDB} algoDB
 * @param {Function} debug
 * @returns {Promise} p
 */
const getAndUpdateRecurringAlgoOrdersList = async (rest, algoDB, debug) => {
  const algoOrders = await getRecurringAosWithRetry(rest, debug)

  const { AlgoOrder } = algoDB

  const activeRecurringAOs = []

  algoOrders.forEach((ao) => {
    const mappedRecurringAO = mapRecurringAlgoOrderState(ao)

    AlgoOrder.set({
      ...mappedRecurringAO,
      state: JSON.stringify(mappedRecurringAO.state)
    })

    const {
      createdAt,
      lastActive,
      algoID,
      gid,
      active,
      state: { args, label, name, alias }
    } = mappedRecurringAO

    if (!active) {
      return
    }
    activeRecurringAOs.push({
      id: algoID,
      label,
      gid,
      alias,
      name,
      args,
      createdAt,
      lastActive
    })
  })

  return activeRecurringAOs
}

module.exports = async (server, ws, credentials, mode) => {
  const { d, restURL, algoDB } = server
  const { apiKey, apiSecret } = credentials

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
    const algoOrders = await getAndUpdateRecurringAlgoOrdersList(rest, algoDB, d)
    send(ws, ['data.recurring_ao_list', mode, algoOrders])
  } catch (e) {
    d('error loading recurring AO %s', e.stack)
    return sendError(ws, e.message, e.i18n)
  }
}

'use strict'

const { Recurring } = require('bfx-hf-algo')
const { RESTv2 } = require('bfx-api-node-rest')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const send = require('../../../util/ws/send')

/**
 * Cancel a new recurring algo order
 *
 * @param {RESTv2} rest
 * @param {object} algoDB
 * @param {string} recurringAlgoOrderId
 * @param {string} gid
 * @returns {Promise<number>}
 */
const cancelRecurringAlgoOrder = async (rest, algoDB, recurringAlgoOrderId, gid) => {
  const { AlgoOrder } = algoDB

  const result = await rest.cancelRecurringAlgoOrder(recurringAlgoOrderId)
  if (result === 1) {
    await AlgoOrder.update({ gid, algoID: Recurring.id }, { active: false, lastActive: Date.now() })
  }
  return result
}

module.exports = async (server, ws, msg) => {
  const { restURL, algoDB } = server
  const [, authToken, exID, recurringAlgoOrderId, gid] = msg
  const { apiKey, apiSecret } = ws.getCredentials()
  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    authToken: { type: 'string', v: authToken },
    algoOrderId: { type: 'string', v: recurringAlgoOrderId },
    gid: { type: 'string', v: gid }
  })

  const sendStatus = (status) => send(ws, ['data.recurring_algo_order.cancel_status', status])

  if (!validRequest) {
    return sendStatus('failed')
  }

  if (!isAuthorized(ws, authToken)) {
    sendStatus('failed')
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  } else if (exID !== 'bitfinex') {
    sendStatus('failed')
    return sendError(ws, 'Algo orders currently only enabled for Bitfinex', ['algoOrdersCurrentlyOnlyEnabledFor', { target: 'Bitfinex' }])
  }

  const rest = new RESTv2({
    transform: true,
    url: restURL,
    apiKey: apiKey,
    apiSecret: apiSecret
  })

  try {
    const result = await cancelRecurringAlgoOrder(rest, algoDB, recurringAlgoOrderId, gid)
    sendStatus(result === 1 ? 'success' : 'failed')
  } catch (e) {
    sendStatus('failed')
    return sendError(ws, e.message, e.i18n)
  }
}

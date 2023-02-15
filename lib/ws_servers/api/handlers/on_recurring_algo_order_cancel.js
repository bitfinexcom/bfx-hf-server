'use strict'

const { Recurring } = require('bfx-hf-algo')
const { RESTv2 } = require('bfx-api-node-rest')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const send = require('../../../util/ws/send')

/**
 * Cancel a recurring algo order
 *
 * @param {RESTv2} rest
 * @param {object} algoDB
 * @param {string} recurringAlgoOrderId
 * @param {string} gid
 * @returns {Promise<number>}
 */
const cancelRecurringAlgoOrder = async (
  rest,
  algoDB,
  recurringAlgoOrderId,
  gid
) => {
  const { AlgoOrder } = algoDB

  const result = await rest.cancelRecurringAlgoOrder(recurringAlgoOrderId)
  if (result === 1) {
    await AlgoOrder.update(
      { gid, algoID: Recurring.id },
      { active: false, lastActive: Date.now() }
    )
  }
  return result
}

module.exports = async (server, ws, params) => {
  const { mode } = ws
  const { restURL, algoDB } = server
  const { exID, recurringAlgoOrderId, gid, alias } = params
  const { apiKey, apiSecret } = ws.getCredentials()
  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    recurringAlgoOrderId: { type: 'string', v: recurringAlgoOrderId },
    gid: { type: 'string', v: gid }
  })

  const sendStatus = (status) =>
    send(ws, ['data.recurring_algo_order.cancel_status', status])

  if (!validRequest) {
    return sendStatus('failed')
  }

  const rest = new RESTv2({
    transform: true,
    url: restURL,
    apiKey: apiKey,
    apiSecret: apiSecret
  })

  try {
    const result = await cancelRecurringAlgoOrder(
      rest,
      algoDB,
      recurringAlgoOrderId,
      gid
    )
    sendStatus(result === 1 ? 'success' : 'failed')
    send(ws, ['data.ao.stopped', 'bitfinex', mode, gid])
    send(ws, [
      'notify',
      'success',
      `Recurring AO ${alias} was removed`,
      {
        key: 'removedRecurringAO',
        props: { alias }
      }
    ])
  } catch (e) {
    sendStatus('failed')
    return sendError(ws, e.message, e.i18n)
  }
}

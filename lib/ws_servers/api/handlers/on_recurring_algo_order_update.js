'use strict'

const Joi = require('joi')
const { RESTv2 } = require('bfx-api-node-rest')
const { Recurring } = require('bfx-hf-algo')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const send = require('../../../util/ws/send')
const {
  VALID_RECURRING_AO_ACTION_TYPES,
  VALID_RECURRING_AO_RECURRENCES,
  RECURRING_ALGO_ORDER_UPDATABLE_FIELDS
} = require('../../../constants')
const { JoiValidator } = require('../../../util/validator')
const mapRecurringAlgoOrderState = require('../../../util/map_recurring_ao_state')

const compareDifferences = (savedOrder, updatedOrder) => {
  const entries = Object.entries(updatedOrder)
  return entries.reduce((acc, [key, value]) => {
    if (
      !RECURRING_ALGO_ORDER_UPDATABLE_FIELDS.includes(key) ||
      savedOrder[key] === value ||
      savedOrder.args[key] === value
    ) {
      return acc
    }
    acc[key] = value
    return acc
  }, {})
}

const validatePayload = (payload) => {
  const schema = Joi.object({
    algoOrderId: Joi.string().required().label('Algo Order Id'),
    alias: Joi.string().optional().label('Alias'),
    currency: Joi.string().optional().label('Currency'),
    action: Joi.string()
      .optional()
      .valid(...VALID_RECURRING_AO_ACTION_TYPES)
      .label('Action'),
    amount: Joi.number().optional().label('Amount'),
    recurrence: Joi.string()
      .optional()
      .valid(...VALID_RECURRING_AO_RECURRENCES)
      .label('Recurrence'),
    endedAt: Joi.date().optional().label('Ended at'),
    endless: Joi.boolean().optional().label('Endless')
  }).nand('endedAt', 'endless')

  const { error, value } = JoiValidator(schema, payload)
  if (error) {
    throw new Error(`Invalid ${error.details[0].context.label}`)
  }

  return value
}

/**
 * Update a recurring algo order
 *
 * @param {RESTv2} rest
 * @param {object} algoDB
 * @param {string} gid
 * @param {object} order
 * @returns {Promise<number>}
 */
const updateRecurringAlgoOrder = async (rest, algoDB, gid, order) => {
  const { AlgoOrder } = algoDB

  const algoOrder = await AlgoOrder.get({ gid, algoID: Recurring.id })

  const payload = compareDifferences(JSON.parse(algoOrder.state), order)

  payload.algoOrderId = algoOrder.recurringAlgoOrderId
  const validatedPayload = validatePayload(payload)

  let mappedRecurringAO
  const result = await rest.updateRecurringAlgoOrder(validatedPayload)

  if (result === 1) {
    const updatedRecurringAO = await rest.getRecurringAlgoOrder(
      validatedPayload.algoOrderId
    )
    mappedRecurringAO = mapRecurringAlgoOrderState(updatedRecurringAO)

    await AlgoOrder.update(
      { gid, algoID: Recurring.id },
      {
        ...mappedRecurringAO,
        state: JSON.stringify(mappedRecurringAO.state)
      }
    )
  }

  return mappedRecurringAO
}

module.exports = async (server, ws, msg) => {
  const { mode } = ws
  const { restURL, algoDB } = server
  const [, authToken, exID, gid, payload] = msg
  const { apiKey, apiSecret } = ws.getCredentials()
  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    exID: { type: 'string', v: exID },
    gid: { type: 'string', v: gid },
    payload: { type: 'object', v: payload }
  })

  const sendStatus = (status) =>
    send(ws, ['data.recurring_algo_order.update_status', status])

  if (!validRequest) {
    return sendStatus('failed')
  }

  if (!isAuthorized(ws, authToken)) {
    sendStatus('failed')
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  } else if (exID !== 'bitfinex') {
    sendStatus('failed')
    return sendError(
      ws,
      'Recurring algo orders currently only enabled for Bitfinex',
      ['recurringAlgoOrdersCurrentlyOnlyEnabledFor', { target: 'Bitfinex' }]
    )
  }

  const rest = new RESTv2({
    transform: true,
    url: restURL,
    apiKey: apiKey,
    apiSecret: apiSecret
  })

  try {
    const {
      createdAt,
      lastActive,
      algoID,
      state: { args, label, alias, name }
    } = await updateRecurringAlgoOrder(rest, algoDB, gid, payload)
    sendStatus('success')
    send(ws, [
      'data.ao',
      'bitfinex',
      mode,
      {
        id: algoID,
        label,
        gid,
        alias,
        name,
        args,
        createdAt,
        lastActive
      }
    ])
    send(ws, [
      'notify',
      'success',
      `Recurring AO ${alias} was updated`,
      {
        key: 'updatedRecurringAO',
        props: { alias }
      }
    ])
  } catch (e) {
    sendStatus('failed')
    return sendError(ws, e.message, e.i18n)
  }
}

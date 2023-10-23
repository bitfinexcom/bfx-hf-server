'use strict'

const _ = require('lodash')
const Joi = require('joi')
const { RESTv2 } = require('bfx-api-node-rest')
const sendError = require('../../../util/ws/send_error')
const send = require('../../../util/ws/send')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const {
  VALID_RECURRING_AO_ACTION_TYPES,
  VALID_RECURRING_AO_RECURRENCES
} = require('../../../constants')
const { JoiValidator } = require('../../../util/validator')
const mapRecurringAlgoOrderState = require('../../../util/map_recurring_ao_state')

const validatePayload = (payload) => {
  const schema = Joi.object({
    alias: Joi.string().optional().label('Alias'),
    _symbol: Joi.string().required().label('Symbol'),
    currency: Joi.string().required().label('Currency'),
    action: Joi.string()
      .required()
      .valid(...VALID_RECURRING_AO_ACTION_TYPES)
      .label('Action'),
    amount: Joi.number().required().label('Amount'),
    recurrence: Joi.string()
      .required()
      .valid(...VALID_RECURRING_AO_RECURRENCES)
      .label('Recurrence'),
    startedAt: Joi.date().optional().label('Started at'),
    endedAt: Joi.date().optional().label('Ended at'),
    endless: Joi.boolean().optional().label('Endless'),
    meta: Joi.any().optional().label('Meta'),
    context: Joi.any().optional().label('Context')
  }).xor('endedAt', 'endless')

  const { error, value } = JoiValidator(schema, payload)
  if (error) {
    throw new Error(`Invalid ${error.details[0].context.label}`)
  }

  return value
}

/**
 * Creates a new recurring algo order
 *
 * @param {RESTv2} rest
 * @param {object} algoDB
 * @param {object} payload
 */
const createRecurringAlgoOrder = async (rest, algoDB, payload) => {
  const validatedPayload = validatePayload(payload)

  const { AlgoOrder } = algoDB

  const order = _.omit(validatedPayload, ['meta', 'context'])
  const recurringAO = await rest.submitRecurringAlgoOrder({ order })
  const mappedRecurringAO = mapRecurringAlgoOrderState(recurringAO)

  await AlgoOrder.set({
    ...mappedRecurringAO,
    state: JSON.stringify(mappedRecurringAO.state)
  })

  return mappedRecurringAO
}

const DUPLICATE_AO_ERROR = 'User already has an active algo order'
const NEW_DUPLICATE_AO_ERROR =
  'The recurring order with equal params is active'

module.exports = async (server, ws, msg) => {
  const { mode } = ws
  const { restURL, algoDB } = server
  const [, authToken, exID, , payload] = msg
  const { apiKey, apiSecret } = ws.getCredentials()
  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    exID: { type: 'string', v: exID },
    payload: { type: 'object', v: payload }
  })
  const sendStatus = (status, ...data) =>
    send(ws, ['data.algo_order.submit_status', status, ...data])

  if (!validRequest) {
    return sendStatus('failed')
  }

  if (!isAuthorized(ws, authToken)) {
    sendStatus('failed')
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  } else if (exID !== 'bitfinex') {
    sendStatus('failed')
    return sendError(ws, 'Algo orders currently only enabled for Bitfinex', [
      'algoOrdersCurrentlyOnlyEnabledFor',
      { target: 'Bitfinex' }
    ])
  }

  const rest = new RESTv2({
    transform: true,
    url: restURL,
    apiKey: apiKey,
    apiSecret: apiSecret
  })

  try {
    const {
      gid,
      createdAt,
      lastActive,
      algoID,
      state: { args, label, name, alias }
    } = await createRecurringAlgoOrder(rest, algoDB, payload)
    sendStatus('success', gid)

    send(ws, [
      'notify',
      'success',
      `Recurring AO ${alias} was created on Bitfinex`,
      {
        key: 'createdRecurringAO',
        props: { alias, target: 'Bitfinex' }
      }
    ])

    send(ws, [
      'data.ao',
      'bitfinex',
      mode,
      { id: algoID, gid, alias, name, label, args, createdAt, lastActive }
    ])
  } catch (e) {
    sendStatus('failed')
    if (e.response && e.response.includes(DUPLICATE_AO_ERROR)) {
      return sendError(ws, NEW_DUPLICATE_AO_ERROR, [
        'algoOrderEqualParamsError'
      ])
    }
    return sendError(ws, e.response, e.i18n)
  }
}

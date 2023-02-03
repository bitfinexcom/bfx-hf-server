'use strict'

const Joi = require('joi')
const { RESTv2 } = require('bfx-api-node-rest')
const sendError = require('../../../util/ws/send_error')
const send = require('../../../util/ws/send')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const { VALID_RECURRING_AO_ACTION_TYPES, VALID_RECURRING_AO_RECURRENCES } = require('../../../constants')
const { JoiValidator } = require('../../../util/validator')
const { Recurring } = require('bfx-hf-algo')

const validatePayload = (payload) => {
  const schema = Joi.object({
    alias: Joi.string().optional().default('Recurring').label('Alias'),
    _symbol: Joi.string().required().label('Symbol'),
    currency: Joi.string().required().label('Currency'),
    action: Joi.string().required().valid(...VALID_RECURRING_AO_ACTION_TYPES).label('Action'),
    amount: Joi.number().required().label('Amount'),
    recurrence: Joi.string().required().valid(...VALID_RECURRING_AO_RECURRENCES).label('Recurrence'),
    startedAt: Joi.date().optional().label('Started at'),
    endedAt: Joi.date().optional().label('Ended at'),
    endless: Joi.boolean().optional().label('Endless')
  }).xor('endedAt', 'endless')

  const { error } = JoiValidator(schema, payload)
  if (error) {
    throw new Error(`Invalid ${error.details[0].context.label}`)
  }
}

/**
 * Creates a new recurring algo order
 *
 * @param {RESTv2} rest
 * @param {object} algoDB
 * @param {object} order
 * @returns {Promise<string>} - algo order id
 */
const createRecurringAlgoOrder = async (rest, algoDB, order) => {
  validatePayload(order)

  const { AlgoOrder } = algoDB

  const algoOrder = await rest.submitRecurringAlgoOrder(order)

  const createdAt = new Date(algoOrder.createdAt).getMilliseconds()
  const algoID = Recurring.id
  await AlgoOrder.set({
    recurringAlgoOrderId: algoOrder._id,
    gid: algoOrder.gid,
    alias: algoOrder.alias,
    createdAt,
    algoID,
    state: JSON.stringify({
      symbol: algoOrder._symbol,
      algoOrderId: algoID,
      amount: algoOrder.amount,
      action: algoOrder.action
    }),
    active: algoOrder.status === 'active',
    lastActive: createdAt
  })

  return algoOrder._id
}

module.exports = async (server, ws, msg) => {
  const { restURL, algoDB } = server
  const [, authToken, exID, , payload] = msg
  const { apiKey, apiSecret } = ws.getCredentials()
  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    exID: { type: 'string', v: exID },
    payload: { type: 'object', v: payload }
  })
  const sendStatus = (status, ...data) => send(ws, ['data.algo_order.submit_status', status, ...data])

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
    const algoOrderId = await createRecurringAlgoOrder(rest, algoDB, payload)
    sendStatus('success', algoOrderId)
  } catch (e) {
    sendStatus('failed')
    return sendError(ws, e.message, e.i18n)
  }
}

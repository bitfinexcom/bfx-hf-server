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
const { Recurring } = require('bfx-hf-algo')

const validatePayload = (payload) => {
  const schema = Joi.object({
    alias: Joi.string().optional().default('Recurring').label('Alias'),
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
    meta: Joi.any().optional().label('Meta')
  }).xor('endedAt', 'endless')

  const { error } = JoiValidator(schema, payload)
  if (error) {
    throw new Error(`Invalid ${error.details[0].context.label}`)
  }
}

/**
 * Creates a new recurring algo order
 *
 * @param {Session} ws
 * @param {RESTv2} rest
 * @param {object} algoDB
 * @param {object} payload
 */
const createRecurringAlgoOrder = async (ws, rest, algoDB, payload) => {
  validatePayload(payload)

  const { dmsScope } = ws
  const { AlgoOrder } = algoDB
  const algoID = Recurring.id

  const { meta = {} } = payload
  const recurringAO = await rest.submitRecurringAlgoOrder(
    _.omit(payload, ['meta'])
  )
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
        meta: { scope: dmsScope, algoOrderId: algoID, ...meta },
        symbol: recurringAO._symbol,
        amount: recurringAO.amount,
        action: recurringAO.action,
        recurrence: recurringAO.recurrence,
        startedAt: new Date(recurringAO.startedAt).getTime(),
        endless: recurringAO.endless,
        ...(recurringAO.endedAt
          ? { endedAt: new Date(recurringAO.endedAt).getTime() }
          : {})
      }
    },
    active: recurringAO.status === 'active',
    lastActive: createdAt
  }

  algoOrder.state.label = Recurring.meta.genOrderLabel(algoOrder.state)

  await AlgoOrder.set({ ...algoOrder, state: JSON.stringify(algoOrder.state) })

  return algoOrder
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
      recurringAlgoOrderId,
      gid,
      alias,
      createdAt,
      lastActive,
      algoID,
      state: { args, label }
    } = await createRecurringAlgoOrder(ws, rest, algoDB, payload)
    sendStatus('success', recurringAlgoOrderId)
    send(ws, [
      'data.ao',
      'bitfinex',
      mode,
      { id: algoID, label, gid, alias, name: alias, args, createdAt, lastActive }
    ])
  } catch (e) {
    sendStatus('failed')
    if (e.message && e.message.includes(DUPLICATE_AO_ERROR)) {
      return sendError(ws, NEW_DUPLICATE_AO_ERROR, [
        'algoOrderEqualParamsError'
      ])
    }
    return sendError(ws, e.message, e.i18n)
  }
}

'use strict'

const Joi = require('joi')
const { RESTv2 } = require('bfx-api-node-rest')
const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const {
  VALID_RECURRING_AO_ACTION_TYPES,
  VALID_RECURRING_AO_RECURRENCES,
  RECURRING_ALGO_ORDER_STATUS
} = require('../../../constants')
const { JoiValidator } = require('../../../util/validator')

const VALID_ALGO_ORDER_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'currency',
  'alias',
  'action',
  'amount',
  '_symbol',
  'status'
]

const validatePayload = (payload) => {
  const schema = Joi.object({
    page: Joi.number().optional().label('Page'),
    limit: Joi.number().optional().label('Limit'),
    sortField: Joi.string().valid(...VALID_ALGO_ORDER_SORT_FIELDS).optional().label('Sort field'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc').optional().label('Sort order'),
    filter: Joi.object({
      status: Joi.array().items(Joi.string().valid(...RECURRING_ALGO_ORDER_STATUS)).optional().label('Status'),
      alias: Joi.string().optional().label('Alias'),
      startedAt: Joi.date().optional().label('Started at'),
      endedAt: Joi.date().optional().label('Ended at'),
      endless: Joi.boolean().optional().label('Endless'),
      recurrence: Joi.string().valid(...VALID_RECURRING_AO_RECURRENCES).optional().label('Recurrence'),
      action: Joi.string().valid(...VALID_RECURRING_AO_ACTION_TYPES).optional().label('Action'),
      _symbol: Joi.string().optional().label('Symbol'),
      currency: Joi.string().optional().label('Currency')
    }).optional().label('Filter')
  })

  const { error } = JoiValidator(schema, payload)
  if (error) {
    throw new Error(`Invalid ${error.details[0].context.label}`)
  }
}

/**
 * Get recurring algo order list
 *
 * @param {RESTv2} rest
 * @param {object} payload
 * @returns {Promise} p
 */
const getRecurringAlgoOrderList = async (rest, payload) => {
  validatePayload(payload)

  return await rest.getRecurringAlgoOrders(payload)
}

module.exports = async (server, ws, msg) => {
  const { d, restURL } = server
  const [, authToken, payload] = msg
  const { apiKey, apiSecret } = ws.getCredentials()
  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    payload: { type: 'object', v: payload }
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
    const algoOrders = await getRecurringAlgoOrderList(rest, payload)
    send(ws, ['data.recurring_ao_list', algoOrders])
  } catch (e) {
    d('error loading recurring AO %s', e.stack)
    return sendError(ws, e.message, e.i18n)
  }
}

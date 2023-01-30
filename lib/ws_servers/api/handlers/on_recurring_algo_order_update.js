'use strict'

const Joi = require('joi')
const { RESTv2 } = require('bfx-api-node-rest')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const send = require('../../../util/ws/send')
const { VALID_RECURRING_AO_ACTION_TYPES, VALID_RECURRING_AO_RECURRENCES } = require('../../../constants')
const { JoiValidator } = require('../../../util/validator')

const validatePayload = (payload) => {
  const schema = Joi.object({
    algoOrderId: Joi.string().required().label('Algo Order Id'),
    alias: Joi.string().optional().label('Alias'),
    _symbol: Joi.string().optional().label('Symbol'),
    currency: Joi.string().optional().label('Currency'),
    action: Joi.string().optional().valid(...VALID_RECURRING_AO_ACTION_TYPES).label('Action'),
    amount: Joi.number().optional().label('Amount'),
    recurrence: Joi.string().optional().valid(...VALID_RECURRING_AO_RECURRENCES).label('Recurrence'),
    endedAt: Joi.date().optional().label('Ended at'),
    endless: Joi.boolean().optional().label('Endless')
  }).nand('endedAt', 'endless')

  const { error } = JoiValidator(schema, payload)
  if (error) {
    throw new Error(`Invalid ${error.details[0].context.label}`)
  }
}

/**
 * Update a new recurring algo order
 *
 * @param {RESTv2} rest
 * @param {object} order
 * @returns {Promise<void>}
 */
const updateRecurringAlgoOrder = async (rest, order) => {
  validatePayload(order)

  await rest.updateRecurringAlgoOrder(order)
}

module.exports = async (server, ws, msg) => {
  const { restURL } = server
  const [, authToken, exID, payload] = msg
  const { apiKey, apiSecret } = ws.getCredentials()
  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    authToken: { type: 'string', v: authToken },
    payload: { type: 'object', v: payload }
  })

  const sendStatus = (status) => send(ws, ['data.recurring_algo_order.update_status', status])

  if (!validRequest) {
    sendStatus('failed')
    return
  }

  if (!isAuthorized(ws, authToken)) {
    sendStatus('failed')
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  } else if (exID !== 'bitfinex') {
    sendStatus('failed')
    return sendError(ws, 'Recurring algo orders currently only enabled for Bitfinex', ['recurringAlgoOrdersCurrentlyOnlyEnabledFor', { target: 'Bitfinex' }])
  }

  const rest = new RESTv2({
    transform: true,
    url: restURL,
    apiKey: apiKey,
    apiSecret: apiSecret
  })

  try {
    await updateRecurringAlgoOrder(rest, payload)
    sendStatus('success')
  } catch (e) {
    sendStatus('failed')
    return sendError(ws, e.message, e.i18n)
  }
}

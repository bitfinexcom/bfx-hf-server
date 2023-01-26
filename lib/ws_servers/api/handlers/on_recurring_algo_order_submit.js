'use strict'

const Joi = require('joi')
const { RESTv2 } = require('bfx-api-node-rest')
const sendError = require('../../../util/ws/send_error')
const send = require('../../../util/ws/send')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const { VALID_RECURRING_AO_ACTION_TYPES, VALID_RECURRING_AO_RECURRENCES } = require('../../../constants')
const { JoiValidator } = require('../../../util/validator')

const validatePayload = (payload) => {
  const schema = Joi.object({
    alias: Joi.string().required().label('Alias'),
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
 * @param {object} order
 * @returns {Promise<void>}
 */
const createRecurringAlgoOrder = async (rest, order) => {
  validatePayload(order)

  await rest.submitRecurringAlgoOrder(order)
}

module.exports = async (server, ws, msg) => {
  const { restURL } = server
  const [, authToken, exID, payload] = msg
  const { apiKey, apiSecret } = ws.getCredentials()
  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    exID: { type: 'string', v: exID },
    payload: { type: 'object', v: payload }
  })
  const sendStatus = (status) => send(ws, ['data.recurring_algo_order.submit_status', status])

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
    await createRecurringAlgoOrder(rest, payload)
    sendStatus('success')
  } catch (e) {
    sendStatus('failed')
    return sendError(ws, e.message, e.i18n)
  }
}

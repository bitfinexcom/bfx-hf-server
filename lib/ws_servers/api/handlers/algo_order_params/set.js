'use strict'

const uuid = require('uuid/v4')
const _isString = require('lodash/isString')

const send = require('../../../../util/ws/send')
const validateAOParams = require('./validate_ao_params')
const sendError = require('../../../../util/ws/send_error')
const isAuthorized = require('../../../../util/ws/is_authorized')
const validateParams = require('../../../../util/ws/validate_params')
const { notifySuccess, notifyError } = require('../../../../util/ws/notify')

module.exports = async (server, ws, msg) => {
  const { d, db, algos, marketData } = server
  const [, authToken, payload] = msg

  const { name, algoID, symbol, params } = payload

  const validRequest = validateParams(ws, {
    name: { type: 'string', v: name },
    algoID: { type: 'string', v: algoID },
    symbol: { type: 'string', v: symbol },
    params: { type: 'object', v: params }
  })

  if (!validRequest) {
    d('error: Invalid request params while saving algo order parameters')
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  }

  const err = validateAOParams(algos, algoID, marketData, params)
  if (err) {
    return notifyError(ws, err)
  }

  const { AlgoOrderParams } = db

  const id = payload.id && _isString(payload.id) ? payload.id : uuid()
  const algoOrderParams = {
    ...payload,
    id
  }

  await AlgoOrderParams.set(algoOrderParams)

  d('Saved algo order parameters %s', id)

  notifySuccess(ws, 'Algo order parameters successfully saved', ['algoOrderParametersSuccessfullySaved'])
  send(ws, ['data.algo_order_params.saved', id, algoOrderParams])
}

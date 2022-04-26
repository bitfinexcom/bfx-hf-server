'use strict'

const _isPlainObject = require('lodash/isPlainObject')
const send = require('../../../../util/ws/send')
const sendError = require('../../../../util/ws/send_error')
const isAuthorized = require('../../../../util/ws/is_authorized')

const COMPARATOR_MAP = {
  eq: '=',
  neq: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<='
}

module.exports = async (server, ws, msg) => {
  const { strategyExecutionDB } = server
  const { StrategyExecution } = strategyExecutionDB
  const [, authToken, queryOpts = {}] = msg

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  }

  const query = []

  if (_isPlainObject(queryOpts)) {
    for (const [key, opt] of Object.entries(queryOpts)) {
      if (_isPlainObject(opt)) {
        const [[comp, val]] = Object.entries(opt)
        if (COMPARATOR_MAP[comp]) {
          query.push([key, COMPARATOR_MAP[comp], val])
        }
      }
    }
  }

  const pastStrategies = await StrategyExecution.find(query)

  send(ws, ['data.past_strategies', pastStrategies])
}

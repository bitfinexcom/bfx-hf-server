'use strict'

const sendError = require('../../../util/ws/send_error')
const send = require('../../../util/ws/send')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const { d, algoDB } = server
  const { AlgoOrder } = algoDB

  const [, authToken] = msg

  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken }
  })

  if (!validRequest) {
    d('invalid request: active_algo_orders_request')
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  } else if (!ws.aoc) {
    return sendError(ws, 'Unauthorized')
  }

  const aos = await AlgoOrder.find([['active', '=', true]])

  send(ws, [
    'algo.active_orders',
    aos.map(({ gid, state }) => {
      const { args, label, name } = JSON.parse(state)
      return { args, gid, label, name }
    })
  ])
}

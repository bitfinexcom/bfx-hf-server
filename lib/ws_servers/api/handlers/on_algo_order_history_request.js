'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const { d, algoDB } = server
  const { AlgoOrder } = algoDB
  const { mode } = ws
  const [, authToken] = msg

  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken }
  })

  if (!validRequest) {
    d('invalid request: algo:order_history')
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  }

  try {
    const algoOrders = await AlgoOrder.find([['active', '=', false]])
    const ordersResp = []
    algoOrders.forEach(ao => {
      const aoState = ao.state ? JSON.parse(ao.state) : {}
      ordersResp.push({
        id: ao.algoID,
        gid: ao.gid,
        alias: aoState.alias,
        name: aoState.name,
        label: aoState.label,
        args: aoState.args,
        i18n: {},
        createdAt: ao.createdAt,
        lastActive: ao.lastActive
      })
    })

    send(ws, ['algo.order_history_loaded', 'bitfinex', mode, ordersResp])
  } catch (err) {
    d('invalid request: algo_order_history_request')
    sendError(ws, err.message)
  }
}

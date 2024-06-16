'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const isPaperPair = require('../../../util/is_paper_pair')

module.exports = async (server, ws, msg) => {
  const { d, algoDB } = server
  const { AlgoOrder } = algoDB
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
    const paperModeAOs = []
    const mainModeAOs = []

    algoOrders.forEach(ao => {
      const aoState = ao.state ? JSON.parse(ao.state) : {}
      const normalizedAO = {
        id: ao.algoID,
        gid: ao.gid,
        alias: aoState.alias,
        name: aoState.name,
        label: aoState.label,
        args: aoState.args,
        i18n: {},
        createdAt: ao.createdAt,
        lastActive: ao.lastActive
      }

      if (isPaperPair(normalizedAO.label)) {
        paperModeAOs.push(normalizedAO)
      } else {
        mainModeAOs.push(normalizedAO)
      }
    })

    send(ws, ['algo.order_history_loaded', 'bitfinex', 'main', mainModeAOs])
    send(ws, ['algo.order_history_loaded', 'bitfinex', 'paper', paperModeAOs])
  } catch (err) {
    d('invalid request: algo_order_history_request')
    sendError(ws, err.message)
  }
}

'use strict'

const sendError = require('../../../util/ws/send_error')
const send = require('../../../util/ws/send')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const { d, algoDB, db } = server
  const { AlgoOrder } = algoDB
  const { Market } = db

  const [, authToken, mode] = msg

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

  if (!['paper', 'main'].includes(mode)) {
    d('error: on_active_algo_orders_request must contain paper or main')
    return
  }

  const aos = await AlgoOrder.find([
    ['active', '=', true]
  ])

  if (aos.length === 0) {
    send(ws, [
      'algo.active_orders',
      []
    ])

    return
  }

  const markets = await Market.find([
    ['p', '=', mode === 'paper' ? 1 : 0]
  ])

  const avPairs = markets.reduce((acc, el) => {
    acc[el.wsID] = 1
    return acc
  }, {})

  const aosMode = aos.filter((el) => {
    const pair = JSON.parse(el.state).args.symbol

    return avPairs[pair] === 1
  })

  send(ws, [
    'algo.active_orders',
    aosMode.map(({ gid, algoID, state }) => {
      const { args, label, name } = JSON.parse(state)
      return { args, gid, algoID, label, name }
    })
  ])
}

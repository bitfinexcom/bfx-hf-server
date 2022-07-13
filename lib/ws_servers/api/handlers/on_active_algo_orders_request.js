'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const isAuthorized = require('../../../util/ws/is_authorized')
const validateParams = require('../../../util/ws/validate_params')
const filterMarketData = require('../../../util/filter_market_data')

module.exports = async (server, ws, msg) => {
  const { d, algoDB, marketData } = server
  const { AlgoOrder } = algoDB

  const [, authToken, mode, initialFetch] = msg

  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken }
  })

  if (!validRequest) {
    d('invalid request: active_algo_orders_request')
    return
  }

  if (!isAuthorized(ws, authToken)) {
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
    send(ws, ['algo.active_orders', initialFetch, mode, []])
    return
  }

  const isPaper = mode === 'paper' ? 1 : 0

  const markets = filterMarketData(marketData, m => m.p === isPaper)

  const avPairs = new Set(markets.map(({ wsID }) => wsID))

  const activeOrders = aos
    .map(ao => {
      return {
        ...ao,
        state: JSON.parse(ao.state)
      }
    })
    .filter((ao) => {
      const pair = ao.state.args.symbol
      return avPairs.has(pair)
    })
    .map(({ gid, createdAt, algoID, state }) => {
      const { args, label, name } = state
      return { args, gid, createdAt, algoID, label, name }
    })

  send(ws, ['algo.active_orders', initialFetch, mode, activeOrders])
}

'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const recurringAlgoOrderLoadHandler = require('./on_recurring_algo_order_load')

module.exports = async (server, ws, msg) => {
  const { d, algoDB } = server
  const { AlgoOrder } = algoDB
  const { mode } = ws

  const [, authToken, orders] = msg

  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    orders: { type: 'array', v: orders }
  })

  if (!validRequest) {
    d('invalid request: algo:load')
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  }

  // specific to desktop app
  for (const algOrder of orders) {
    const { algoID, gid } = algOrder
    try {
      const ao = await AlgoOrder.get({ algoID, gid })
      const { state, active, createdAt, recurringAlgoOrderId } = ao || {}

      if (!state || !active) {
        continue
      }

      if (recurringAlgoOrderId) {
        await recurringAlgoOrderLoadHandler(server, ws, [null, authToken, recurringAlgoOrderId, gid])
        continue
      }

      const [serialized, uiData] = await ws.getAlgoWorker().host.loadAO(algoID, gid, JSON.parse(state), createdAt)
      const { id, name, label, args, i18n } = uiData
      const { lastActive } = serialized
      const alias = uiData.alias || name

      d('AO loaded for user %s [%s]', 'HF_UI', gid)

      send(ws, ['algo.order_loaded', gid])
      send(ws, ['data.ao', 'bitfinex', mode, { id, gid, alias, name, label, args, i18n, createdAt, lastActive }])
    } catch (e) {
      d('error loading AO %s: %s', algoID, e.stack)
      sendError(ws, `Failed to start algo order: ${algoID}`, ['failedToStartAlgoOrder', { algoID }])
    }
  }
}

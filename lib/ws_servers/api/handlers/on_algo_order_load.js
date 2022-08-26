'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')

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
      const { state, active, createdAt } = ao || {}

      if (!state || !active) {
        continue
      }

      const [, uiData] = await ws.getAlgoWorker().host.loadAO(algoID, gid, JSON.parse(state), createdAt)
      const { id, name, label, args, i18n } = uiData

      d('AO loaded for user %s [%s]', 'HF_UI', gid)

      send(ws, ['algo.order_loaded', gid])
      send(ws, ['data.ao', 'bitfinex', mode, { id, gid, name, label, args, i18n, createdAt }])
    } catch (e) {
      d('error loading AO %s: %s', algoID, e.stack)
      sendError(ws, `Failed to start algo order: ${algoID}`, ['failedToStartAlgoOrder', { algoID }])
    }
  }
}

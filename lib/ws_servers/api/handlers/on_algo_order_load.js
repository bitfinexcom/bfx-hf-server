'use strict'

const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const { d, algoDB } = server
  const { AlgoOrder } = algoDB

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
    return sendError(ws, 'Unauthorized')
  }

  // specific to desktop app
  for (const algOrder of orders) {
    const { algoID, gid } = algOrder
    try {
      const ao = await AlgoOrder.get({ algoID, gid })
      let { state, active } = ao || {}

      if (!state || !active) {
        continue
      }

      state = JSON.parse(state)
      state.active = true

      ws.algoWorker.host.loadAO(algoID, gid, state)

      d('AO loaded for user %s [%s]', 'HF_UI', gid)
    } catch (e) {
      d('error loading AO %s: %s', algoID, e.stack)
      sendError(ws, `Failed to start algo order: ${algoID}`)
    }
  }
}

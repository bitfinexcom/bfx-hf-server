'use strict'

const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')

const getHostKey = require('../util/get_host_key')

module.exports = async (server, ws, msg) => {
  const { d, hosts, algoDB } = server
  const { AlgoOrder } = algoDB
  const [, userID, exID, orders] = msg

  const validRequest = validateParams(ws, {
    userID: { type: 'string', v: userID },
    orders: { type: 'array', v: orders }
  })

  if (!validRequest) {
    return d('invalid request: algos:handlers:on_load')
  } else if (!ws.userID) {
    return sendError(ws, 'Not identified')
  } else if (ws.userID !== userID) {
    d('tried to load AO for user that differs from ws ident (%s)', userID)
    return sendError(ws, 'Unauthorised')
  }

  const key = getHostKey(userID, exID)
  const host = hosts[key]

  if (!host) {
    return sendError(ws, `Host not open for user ${userID} on exchange ${exID}`)
  }

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
      await host.loadAO(algoID, gid, state)
      d('AO loaded for user %s on exchange %s [%s]', userID, exID, gid)
    } catch (e) {
      d('error loading AO %s for %s: %s', algoID, exID, e.stack)
      sendError(ws, `Failed to start algo order: ${algoID}`)
    }
  }
}

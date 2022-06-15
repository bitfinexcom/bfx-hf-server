'use strict'

const sendError = require('../../../util/ws/send_error')
const send = require('../../../util/ws/send')
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
    d('invalid request: algo:remove')
    return
  }

  const bfxClient = ws.getClient()

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  } else if (!bfxClient) {
    return sendError(ws, 'No client open for Bitfinex', ['noClientOpenFor', { target: 'Bitfinex' }])
  }

  const removedOrders = []
  const activeOrders = await bfxClient.rest.activeOrders()

  for (const algOrder of orders) {
    const { gid, algoID } = algOrder
    try {
      if (activeOrders.some(order => order.gid === +gid)) {
        await bfxClient.cancelOrdersByGid(+gid)
      }
      const updated = await AlgoOrder.update({ gid, algoID }, { active: false })
      if (updated) removedOrders.push(gid)
    } catch (err) {
      sendError(ws, `Error removing order: ${algoID} [${gid}]`, ['errorRemovingOrder', { algoID, gid }])
      d('error removing order %s [%s]: %s', gid, algoID, err.stack)
    }
  }

  send(ws, ['algo.orders_removed', removedOrders])

  d('removed selected orders %s', JSON.stringify(removedOrders))
}

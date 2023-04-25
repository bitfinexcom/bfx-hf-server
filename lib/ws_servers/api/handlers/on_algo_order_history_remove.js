'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const { notifySuccess } = require('../../../util/ws/notify')

module.exports = async (server, ws, msg) => {
  const { d, algoDB } = server
  const { AlgoOrder } = algoDB

  const [, authToken, gid, algoID, mode] = msg

  const validRequest = validateParams(ws, {
    authToken: { type: 'string', v: authToken },
    gid: { type: 'string', v: gid },
    algoID: { type: 'string', v: algoID },
    mode: { type: 'string', v: mode }
  })

  if (!validRequest) {
    d('invalid request: algo:order_history_remove')
    return
  }

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  }

  try {
    await AlgoOrder.rm({ gid, algoID })
    send(ws, ['algo.order_history_removed', gid, mode])
    notifySuccess(ws, 'The algo order has been removed successfully from history', ['algoOrderRemovedFromHistorySuccessfully'])
  } catch (err) {
    d('invalid request: algo_order_history_remove_request')
    sendError(ws, err.message)
  }
}

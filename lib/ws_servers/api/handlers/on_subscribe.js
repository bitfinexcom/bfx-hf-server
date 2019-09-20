'use strict'

const validateParams = require('../../../util/ws/validate_params')
const addPoolClient = require('../../../ws_clients/ex_pool/add_client')

module.exports = (server, ws, msg) => {
  const [, exID, channelData] = msg
  const validRequest = validateParams(ws, {
    exID: { type: 'string', v: exID },
    channelData: { type: 'object', v: channelData }
  })

  if (!validRequest) {
    return
  }

  const poolMessage = ['sub', exID, channelData]
  const { pc } = server

  if (!ws.subscriptions) ws.subscriptions = {}
  if (!ws.subscriptions[exID]) ws.subscriptions[exID] = []

  ws.subscriptions[exID].push(channelData)

  addPoolClient(pc, exID, channelData, ws)
  pc.send(poolMessage)
}

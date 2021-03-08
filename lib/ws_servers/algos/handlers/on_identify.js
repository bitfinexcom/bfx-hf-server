'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')

module.exports = (server, ws, msg) => {
  const [, userID] = msg
  const validRequest = validateParams(ws, {
    userID: { type: 'string', v: userID }
  })

  if (!validRequest) {
    return
  }

  if (ws.userID) {
    return sendError(ws, `Already identified as ${userID}`)
  }

  ws.userID = userID

  send(ws, ['identified', userID])
}

'use strict'

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')

/**
 * @param {Session} session
 * @param {FilteredWebSocket} ws
 * @param {RESTv2} rest
 */
module.exports = async (session, ws, rest) => {
  const { mode } = session

  try {
    const { username } = await rest.userInfo()
    send(ws, ['info.username', mode, username])
  } catch (err) {
    sendError(ws, err.message)
  }
}

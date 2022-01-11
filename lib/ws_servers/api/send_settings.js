'use strict'

const send = require('../../util/ws/send')
const sendError = require('../../util/ws/send_error')
const isAuthorized = require('../../util/ws/is_authorized')
const getUserSettings = require('../../util/user_settings')

module.exports = async (server, ws, msg) => {
  const { db } = server
  const [, authToken] = msg

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized', ['unauthorized'])
  }

  const userSettings = await getUserSettings(db)

  send(ws, ['data.settings.updated', userSettings])
}

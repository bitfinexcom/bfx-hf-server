'use strict'

const send = require('../../util/ws/send')
const sendError = require('../../util/ws/send_error')
const isAuthorized = require('../../util/ws/is_authorized')
const d = require('debug')

module.exports = async (server, ws, msg) => {
  const { db } = server
  const { UserSettings } = db

  const [, authToken] = msg
  d(db)
 if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const s = await UserSettings.getAll()
  send(ws, ['data.settings.updated', s])
}

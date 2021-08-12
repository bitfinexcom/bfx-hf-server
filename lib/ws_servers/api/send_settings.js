'use strict'

const { _default } = require('bfx-hf-ui-config').UserSettings

const send = require('../../util/ws/send')
const sendError = require('../../util/ws/send_error')
const isAuthorized = require('../../util/ws/is_authorized')

module.exports = async (server, ws, msg) => {
  const { db } = server
  const { UserSettings } = db
  const [, authToken] = msg

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const defaultSettings = _default
  const { userSettings = {} } = await UserSettings.getAll()

  const mergedSettings = Object.assign({}, defaultSettings, userSettings)

  send(ws, ['data.settings.updated', mergedSettings])
}

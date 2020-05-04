
const { _default } = require('bfx-hf-ui-config').UserSettings

const send = require('../../util/ws/send')
const sendError = require('../../util/ws/send_error')
const isAuthorized = require('../../util/ws/is_authorized')
const def = { 
  chart: 'Trading view', 
  theme: 'bfx-dark-theme', 
  dms: true
}

module.exports = async (server, ws, msg) => {
  const { db, d } = server
  const { UserSettings } = db
  const [, authToken] = msg

  if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const { userSettings } = await UserSettings.getAll()
  d(userSettings)
  send(ws, ['data.settings.updated', userSettings || _default])
}

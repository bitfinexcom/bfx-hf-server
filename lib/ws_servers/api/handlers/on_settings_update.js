'use strict'

const { _default } = require('bfx-hf-ui-config').UserSettings
const { affiliateCode } = _default

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const {
  notifySuccess
} = require('../../../util/ws/notify')

module.exports = async (server, ws, msg) => {
  const { d, db, reconnectAlgoHost } = server
  const { UserSettings } = db
  const [, authToken, dms, ga, showAlgoPauseInfo, showOnlyFavoritePairs, rebootAutomatically] = msg

  const validRequest = validateParams(ws, {
    dms: { type: 'bool', v: dms },
    ga: { type: 'bool', v: ga },
    showAlgoPauseInfo: { type: 'bool', v: showAlgoPauseInfo },
    rebootAutomatically: { type: 'bool', v: rebootAutomatically },
    showOnlyFavoritePairs: { type: 'bool', v: showOnlyFavoritePairs }
  })

  if (!validRequest) {
    return
  } if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const { userSettings: oldSettings = {} } = await UserSettings.getAll()
  const settings = {
    ga,
    dms,
    affiliateCode,
    showAlgoPauseInfo,
    rebootAutomatically,
    showOnlyFavoritePairs
  }

  await UserSettings.set(settings)

  d('UI settings has been updated')

  ws.UserSettings = settings

  notifySuccess(ws, 'Settings successfully updated')

  send(ws, ['data.settings.updated', settings])

  if (oldSettings.dms !== settings.dms) {
    d('issuing API & Algo reconnect due to DMS change [dms %s]', settings.dms)

    if (ws.clients.bitfinex) {
      ws.clients.bitfinex.setDMS(settings.dms)
    }

    Object.values(ws.clients).forEach(ex => ex.reconnect())

    await reconnectAlgoHost(ws)

    notifySuccess(ws, 'Reconnecting with new DMS setting...')
  }
}

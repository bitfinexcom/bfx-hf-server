'use strict'

const { _default: DEFAULT_USER_SETTINGS, THEMES } = require('bfx-hf-ui-config').UserSettings
const { affiliateCode } = DEFAULT_USER_SETTINGS

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const {
  notifySuccess
} = require('../../../util/ws/notify')
const connectionManager = require('../start_connections')

module.exports = async (server, ws, msg) => {
  const { d, db } = server
  const { UserSettings } = db
  const [, authToken, dms, showAlgoPauseInfo, showOnlyFavoritePairs, rebootAutomatically, theme, joinBetaProgram] = msg

  const validRequest = validateParams(ws, {
    dms: { type: 'bool', v: dms },
    theme: { type: 'enum', v: [Object.values(THEMES), theme] },
    showAlgoPauseInfo: { type: 'bool', v: showAlgoPauseInfo },
    rebootAutomatically: { type: 'bool', v: rebootAutomatically },
    showOnlyFavoritePairs: { type: 'bool', v: showOnlyFavoritePairs },
    joinBetaProgram: { type: 'bool', v: joinBetaProgram }
  })

  if (!validRequest) {
    return
  } if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const { userSettings: oldSettings = DEFAULT_USER_SETTINGS } = await UserSettings.getAll()
  const settings = {
    dms,
    theme,
    affiliateCode,
    joinBetaProgram,
    showAlgoPauseInfo,
    rebootAutomatically,
    showOnlyFavoritePairs
  }

  await UserSettings.set(settings)

  d('UI settings has been updated')

  ws.UserSettings = settings

  notifySuccess(ws, 'Settings successfully updated', ['settingsSuccessfullyUpdated'])

  send(ws, ['data.settings.updated', settings])

  if (oldSettings.dms !== settings.dms) {
    d('issuing API & Algo reconnect due to DMS change [dms %s]', settings.dms)

    await connectionManager.updateDms(ws, dms)

    notifySuccess(ws, 'Reconnecting with new DMS setting...', ['reconnectingWithNewDmsSetting'])
  }
}

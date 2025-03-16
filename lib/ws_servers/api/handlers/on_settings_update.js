'use strict'

const { _default: DEFAULT_USER_SETTINGS, THEMES } = require('bfx-hf-ui-config').UserSettings
const { affiliateCode } = DEFAULT_USER_SETTINGS

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const { notifySuccess, notifyError } = require('../../../util/ws/notify')
const connectionManager = require('../start_connections')

const MAX_PACKET_WD_DELAY = 10 * 60 * 1000 // 10 minutes

module.exports = async (server, ws, msg) => {
  const { d, db } = server
  const { sendDataToMetricsServer } = ws
  const { UserSettings } = db
  const [
    ,
    authToken,
    {
      dms: isDmsEnabled,
      showAlgoPauseInfo,
      showOnlyFavoritePairs,
      theme,
      hideOnClose,
      fullScreen,
      packetWDDelay,
      autoResumeAOs,
      timestampFormat
    },
    dmsScope
  ] = msg

  const validRequest = validateParams(ws, {
    dms: { type: 'bool', v: isDmsEnabled },
    theme: { type: 'enum', v: [Object.values(THEMES), theme] },
    showAlgoPauseInfo: { type: 'bool', v: showAlgoPauseInfo },
    showOnlyFavoritePairs: { type: 'bool', v: showOnlyFavoritePairs },
    hideOnClose: { type: 'bool', v: hideOnClose },
    fullScreen: { type: 'bool', v: fullScreen },
    dmsScope: { type: 'string', v: dmsScope },
    packetWDDelay: { type: 'number', v: packetWDDelay },
    autoResumeAOs: { type: 'bool', v: autoResumeAOs }
  })

  if (packetWDDelay && packetWDDelay > MAX_PACKET_WD_DELAY) {
    return sendError(ws, 'The disconnection delay cannot be greater than 10 minutes')
  }

  if (!validRequest) {
    return
  } if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  try {
    const { userSettings: oldSettings = DEFAULT_USER_SETTINGS } = await UserSettings.getAll()
    const settings = {
      dms: isDmsEnabled,
      theme,
      affiliateCode,
      showAlgoPauseInfo,
      showOnlyFavoritePairs,
      hideOnClose,
      fullScreen,
      packetWDDelay,
      autoResumeAOs,
      timestampFormat
    }

    await UserSettings.set(settings)

    d('UI settings has been updated')

    notifySuccess(ws, 'Settings successfully updated', ['settingsSuccessfullyUpdated'])

    send(ws, ['data.settings.updated', settings])

    if (oldSettings.dms !== settings.dms) {
      d('issuing API & Algo reconnect due to DMS change [dms %s]', settings.dms)

      await connectionManager.updateDms(server, ws, isDmsEnabled, dmsScope)

      notifySuccess(ws, 'Reconnecting with new DMS setting...', ['reconnectingWithNewDmsSetting'])
    }
  } catch (e) {
    d('failed to update the settings %s', e.stack)
    notifyError(ws, 'Failed to update settings', ['settingsUpdateFailed'])
    sendDataToMetricsServer(['setting_update_fail', e.stack])
  }
}

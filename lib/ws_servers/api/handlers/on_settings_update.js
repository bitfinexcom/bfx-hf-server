const { _default, CHARTS } = require('bfx-hf-ui-config').UserSettings
const { affiliateCode } = _default

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const {
  notifySuccess, notifyInfo
} = require('../../../util/ws/notify')

module.exports = async (server, ws, msg) => {
  const { d, db } = server
  const { UserSettings } = db
  const [, authToken, chart, dms, theme, ga] = msg

  const validRequest = validateParams(ws, {
    chart: { type: 'string', v: chart },
    theme: { type: 'string', v: theme },
    dms: { type: 'bool', v: dms },
    ga: { type: 'bool', v: ga }
  })

  if (!validRequest) {
    return
  } if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const { userSettings: oldSettings = {} } = await UserSettings.getAll()
  const settings = {
    chart,
    theme,
    dms,
    affiliateCode,
    ga
  }

  await UserSettings.set(settings)

  d('UI settings has been updated')

  ws.UserSettings = settings

  notifySuccess(ws, 'Settings successfully updated')

  if (chart === CHARTS.TRADING_VIEW) {
    notifyInfo(ws, 'Warning: The Trading View chart does not support rendering of order and position lines')
  }

  send(ws, ['data.settings.updated', settings])

  if (oldSettings.dms !== settings.dms) {
    d('issuing API & Algo reconnect due to DMS change [dms %s]', settings.dms)

    if (ws.clients.bitfinex) {
      ws.clients.bitfinex.setDMS(settings.dms)
    }

    Object.values(ws.clients).forEach(ex => ex.reconnect())

    if (ws.aoc) {
      ws.aoc.reconnect()
    }

    notifySuccess(ws, 'Reconnecting with new DMS setting...')
  }
}

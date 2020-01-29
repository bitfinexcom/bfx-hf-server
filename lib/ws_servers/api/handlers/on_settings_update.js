

const { _default, CHARTS } = require('bfx-hf-ui-config').UserSettings

const { AFFILIATE_CODE } = _default

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const isAuthorized = require('../../../util/ws/is_authorized')
const {
  notifySuccess, notifyInfo,
} = require('../../../util/ws/notify')

module.exports = async (server, ws, msg) => {
  const { d, db } = server
  const { UserSettings } = db
  const [, authToken, chart, dms, theme] = msg

  const validRequest = validateParams(ws, {
    chart: { type: 'string', v: chart },
    theme: { type: 'string', v: theme },
    dms: { type: 'bool', v: dms },
  })

  if (!validRequest) {
    return
  } if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const settings = {
    chart,
    theme,
    dms,
    affiliateCode: AFFILIATE_CODE,
  }
  await UserSettings.set(settings)

  d('UI settings has been updated')

  ws.UserSettings = settings

  notifySuccess(ws, 'HF Settings has been updated!')
  if (chart === CHARTS.TRADING_VIEW) {
    notifyInfo(ws, 'Orders/postions won\'t show up, while you are using Trading view chart.')
  }
  send(ws, ['data.settings.updated', settings])
}

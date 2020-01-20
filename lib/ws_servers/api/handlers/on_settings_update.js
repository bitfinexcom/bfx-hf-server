'use strict'

const _capitalize = require('lodash/capitalize')

const send = require('../../../util/ws/send')
const sendError = require('../../../util/ws/send_error')
const validateParams = require('../../../util/ws/validate_params')
const {
  notifyInternalError, notifySuccess, notifyError
} = require('../../../util/ws/notify')
const validExchange = require('../../../util/valid_exchange')
const verifyPassword = require('../../../util/verify_password')
const encryptAPICredentials = require('../../../util/encrypt_api_credentials')
const isAuthorized = require('../../../util/ws/is_authorized')
const capture = require('../../../capture')
const openAuthBitfinexConnection = require('../open_auth_bitfinex_connection')
const openAuthBinanceConnection = require('../open_auth_binance_connection')

module.exports = async (server, ws, msg) => {
  const { d, db } = server
  const { UserSettings } = db
  const [, authToken, chart, dms, theme] = msg

  const validRequest = validateParams(ws, {
    chart: { type: 'string', v: chart },
    theme: { type: 'string', v: theme },
    dms: { type: 'bool', v: dms }
  })

  if (!validRequest) {
    return
  } else if (!isAuthorized(ws, authToken)) {
    return sendError(ws, 'Unauthorized')
  }

  const settings = {
      chart,
      theme,
      dms,
      affiliateCode: 'xZvWHMNR'
  }
  const s = await UserSettings.getAll()
  if(!s.length) {
    d('---- settings is empty', UserSettings)
    const a = await UserSettings.write(settings)
    const b = await UserSettings.update(settings)
    const c = await UserSettings.insert(settings) 
    d(a,b,c)
  } else {
    await UserSettings.update(settings)
  }
  d('----- user settings: ', await UserSettings.getAll())

  d('UI settings has been updated')

  ws[`UISettings`] = settings

  notifySuccess(ws, `HF Settings has been updated!`)
  send(ws, ['data.settings.updated', settings])
}

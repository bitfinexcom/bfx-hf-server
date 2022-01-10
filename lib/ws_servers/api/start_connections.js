'use strict'

const { _default: DEFAULT_SETTINGS } = require('bfx-hf-ui-config').UserSettings
const { DEFAULT_USER } = require('../../constants')

const DmsRemoteControl = require('./dms_remote_control')
const openAuthBitfinexConnection = require('./open_auth_bitfinex_connection')

const getDms = async (db) => {
  const { UserSettings } = db
  const { userSettings } = await UserSettings.getAll()
  const { dms } = userSettings || DEFAULT_SETTINGS
  return dms
}

module.exports = async ({ ws, db, d, apiKey, apiSecret, wsURL, restURL, hostedURL, dmsScope }) => {
  const dms = await getDms(db)

  if (dms) {
    ws.dmsControl = new DmsRemoteControl({
      hostedURL,
      restURL,
      apiKey,
      apiSecret
    })
    await ws.dmsControl.open(dmsScope)
  }

  // for algo orders
  await ws.algoWorker.start({
    apiKey,
    apiSecret,
    userId: DEFAULT_USER
  })

  // for atomic orders
  ws.clients.bitfinex = openAuthBitfinexConnection({
    ws,
    apiKey,
    apiSecret,
    dms,
    d,
    wsURL,
    restURL
  })
}

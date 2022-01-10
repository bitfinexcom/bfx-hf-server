'use strict'

const { DEFAULT_USER } = require('../../constants')
const openAuthBitfinexConnection = require('./open_auth_bitfinex_connection')
const { _default: DEFAULT_SETTINGS } = require('bfx-hf-ui-config').UserSettings

const getDms = async (db) => {
  const { UserSettings } = db
  const { userSettings } = await UserSettings.getAll()
  const { dms } = userSettings || DEFAULT_SETTINGS
  return dms
}

module.exports = async (ws, db, d, { apiKey, apiSecret, opts }) => {
  const dms = await getDms(db)
  await ws.algoWorker.start({ apiKey, apiSecret, userId: DEFAULT_USER })
  ws.clients.bitfinex = openAuthBitfinexConnection({ ws, apiKey, apiSecret, dms, d, opts })
}

'use strict'

const { _default: DEFAULT_SETTINGS } = require('bfx-hf-ui-config').UserSettings
const HFDB = require('bfx-hf-models')
const HFDBLowDBAdapter = require('bfx-hf-models-adapter-lowdb')
const {
  schema: HFDBBitfinexSchema
} = require('bfx-hf-ext-plugin-bitfinex')

const BFXAOAdapter = require('./ao_adapter')
const initAOHost = require('./init_ao_host')

module.exports = async (server, apiKey, apiSecret) => {
  const { dbPath, apiDB, d, wsURL, restURL } = server
  const { UserSettings } = apiDB
  const { userSettings: settings } = await UserSettings.getAll()
  const { dms, affiliateCode } = settings || DEFAULT_SETTINGS

  d(
    'spawning bfx algo host (dms %s) [aff %s]',
    dms ? 'enabled' : 'disabled',
    affiliateCode
  )

  return initAOHost({
    adapter: new BFXAOAdapter({
      apiKey,
      apiSecret,
      dms: dms ? 4 : 0,
      withHeartbeat: true,
      affiliateCode,
      wsURL,
      restURL
    }),

    db: new HFDB({
      schema: HFDBBitfinexSchema,
      adapter: HFDBLowDBAdapter({
        dbPath
      })
    }),

    initCB: async (aoHost) => {}
  })
}

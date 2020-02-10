'use strict'

const HFDB = require('bfx-hf-models')
const { RESTv2 } = require('bfx-api-node-rest')
const HFDBLowDBAdapter = require('bfx-hf-models-adapter-lowdb')
const {
  AOAdapter: BFXAOAdapter,
  schema: HFDBBitfinexSchema
} = require('bfx-hf-ext-plugin-bitfinex')

const initAOHost = require('../../util/init_ao_host')
const BitfinexEXA = require('../../exchange_clients/bitfinex')

module.exports = async (server, apiKey, apiSecret) => {
  const { dbPath, apiDB, d } = server
  const { UserSettings } = apiDB
  const { userSettings: settings } = await UserSettings.getAll()
  const { dms, affiliateCode } = settings

  d('spawning bfx algo host (dms %s)', dms ? 'enabled' : 'disabled')

  return initAOHost({
    adapter: new BFXAOAdapter({
      apiKey,
      apiSecret,
      dms: dms ? 4 : 0,
      withHeartbeat: true,
      affiliateCode,
    }),

    db: new HFDB({
      schema: HFDBBitfinexSchema,
      adapter: HFDBLowDBAdapter({
        dbPath
      })
    }),

    initCB: async (aoHost) => {
      const { aos } = aoHost
      const rest = new RESTv2({
        apiKey,
        apiSecret
      })

      await BitfinexEXA.registerUIDefs(aos, rest)
    }
  })
}

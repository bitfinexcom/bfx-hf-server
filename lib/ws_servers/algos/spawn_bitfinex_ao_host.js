'use strict'

const { _default: DEFAULT_SETTINGS } = require('bfx-hf-ui-config').UserSettings
const HFDB = require('bfx-hf-models')
const HFDBLowDBAdapter = require('bfx-hf-models-adapter-lowdb')
const {
  schema: HFDBBitfinexSchema
} = require('bfx-hf-ext-plugin-bitfinex')

const { AOHost } = require('bfx-hf-algo')
const {
  PingPong, Iceberg, TWAP, AccumulateDistribute, MACrossover, OCOCO
} = require('bfx-hf-algo')

const algoOrders = [
  PingPong, Iceberg, TWAP, AccumulateDistribute, MACrossover, OCOCO
]

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

  const wsSettings = {
    apiKey,
    apiSecret,
    dms: dms ? 4 : 0,
    withHeartbeat: true,
    affiliateCode,
    wsURL,
    restURL
  }

  const host = new AOHost({
    db: new HFDB({
      schema: HFDBBitfinexSchema,
      adapter: HFDBLowDBAdapter({
        dbPath
      })
    }),
    aos: algoOrders,
    wsSettings
  })

  host.connect()

  return host
}

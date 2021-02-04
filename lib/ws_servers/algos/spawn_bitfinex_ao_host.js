'use strict'

const { _default: DEFAULT_SETTINGS } = require('bfx-hf-ui-config').UserSettings

const { AOHost } = require('bfx-hf-algo')
const {
  PingPong, Iceberg, TWAP, AccumulateDistribute, MACrossover, OCOCO
} = require('bfx-hf-algo')

const algoOrders = [
  PingPong, Iceberg, TWAP, AccumulateDistribute, MACrossover, OCOCO
]

module.exports = async (server, apiKey, apiSecret) => {
  const { apiDB, d, wsURL, restURL } = server
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
    aos: algoOrders,
    wsSettings
  })

  host.connect()

  return host
}

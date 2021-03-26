'use strict'

const { _default: DEFAULT_SETTINGS } = require('bfx-hf-ui-config').UserSettings
const { algos } = require('./algo_server.conf.json')

const { AOHost } = require('bfx-hf-algo')

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
    aos: loadAlgos(algos),
    wsSettings
  })

  host.connect()

  return host
}

function loadAlgos (algos) {
  const algoOrders = algos.map((el) => {
    return require('bfx-hf-algo')[el]
  })

  return algoOrders
}

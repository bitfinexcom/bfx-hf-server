'use strict'

const HFDB = require('bfx-hf-models')
const HFDBLowDBAdapter = require('bfx-hf-models-adapter-lowdb')
const {
  AOAdapter,
  schema: HFDBBinanceSchema
} = require('bfx-hf-ext-plugin-binance')

const initAOHost = require('../../util/init_ao_host')

module.exports = (server, apiKey, apiSecret) => {
  const { dbPath } = server

  return initAOHost({
    adapter: new AOAdapter({ apiKey, apiSecret }),
    db: new HFDB({
      schema: HFDBBinanceSchema,
      adapter: HFDBLowDBAdapter({
        dbPath
      })
    })
  })
}

'use strict'

const HFDB = require('bfx-hf-models')
const HFDBLowDBAdapter = require('bfx-hf-models-adapter-lowdb')
const {
  AOAdapter: BinanceAOAdapter,
  schema: HFDBBinanceSchema
} = require('bfx-hf-ext-plugin-binance')

const initAOHost = require('../../util/init_ao_host')

module.exports = async (server, apiKey, apiSecret) => {
  const { dbPath } = server

  return initAOHost({
    adapter: new BinanceAOAdapter({
      apiKey,
      apiSecret
    }),

    db: new HFDB({
      schema: HFDBBinanceSchema,
      adapter: HFDBLowDBAdapter({
        dbPath
      })
    })
  })
}

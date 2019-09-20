'use strict'

const HFDB = require('bfx-hf-models')
const HFDBLowDBAdapter = require('bfx-hf-models-adapter-lowdb')
const {
  AOAdapter,
  schema: HFDBBitfinexSchema
} = require('bfx-hf-ext-plugin-bitfinex')

const initAOHost = require('../../util/init_ao_host')

module.exports = (server, apiKey, apiSecret) => {
  const { dbPath } = server

  return initAOHost({
    adapter: new AOAdapter({ apiKey, apiSecret, dms: 4 }),
    db: new HFDB({
      schema: HFDBBitfinexSchema,
      adapter: HFDBLowDBAdapter({
        dbPath
      })
    })
  })
}

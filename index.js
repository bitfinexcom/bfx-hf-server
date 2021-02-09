'use strict'

require('bfx-hf-util/lib/catch_uncaught_errors')

const HFDB = require('bfx-hf-models')
const DataServer = require('bfx-hf-data-server')
const HFDBLowDBAdapter = require('bfx-hf-models-adapter-lowdb')
const { schema: HFDBBitfinexSchema } = require('bfx-hf-ext-plugin-bitfinex')
const { schema: HFDBDummySchema } = require('bfx-hf-ext-plugin-dummy')

const EXAS = require('./lib/exchange_clients')
const AlgoServer = require('./lib/ws_servers/algos')
const APIWSServer = require('./lib/ws_servers/api')
const syncMarkets = require('./lib/sync_meta')
const capture = require('./lib/capture')

module.exports = ({
  bfxRestURL,
  bfxWSURL,
  uiDBPath,
  algoDBPath,
  hfBitfinexDBPath,
  algoServerPort = 25223,
  wsServerPort = 45000,
  hfDSBitfinexPort = 23521
}) => {
  let dbBitfinex = null

  if (hfBitfinexDBPath && hfDSBitfinexPort) {
    dbBitfinex = new HFDB({
      schema: HFDBBitfinexSchema,
      adapter: HFDBLowDBAdapter({ dbPath: hfBitfinexDBPath })
    })
  }

  const apiDB = new HFDB({
    schema: HFDBDummySchema,
    adapter: HFDBLowDBAdapter({ dbPath: uiDBPath })
  })

  const algoDB = new HFDB({
    schema: HFDBDummySchema,
    adapter: HFDBLowDBAdapter({ dbPath: algoDBPath })
  })

  const as = new AlgoServer({
    algoDB,
    apiDB,
    port: algoServerPort,
    wsURL: bfxWSURL,
    restURL: bfxRestURL
  })

  let dsBitfinex = null

  if (dbBitfinex) {
    dsBitfinex = new DataServer({
      port: hfDSBitfinexPort,
      db: dbBitfinex,
      restURL: bfxRestURL,
      wsURL: bfxWSURL
    })
  }

  const api = new APIWSServer({
    algoDB,
    db: apiDB,
    port: wsServerPort,
    algoServerURL: `http://localhost:${algoServerPort}`,
    hfDSBitfinexURL: `http://localhost:${hfDSBitfinexPort}`,
    restURL: bfxRestURL,
    wsURL: bfxWSURL
  })

  const opts = { wsURL: bfxWSURL, restURL: bfxRestURL }
  syncMarkets(apiDB, EXAS, opts).then(() => {
    as.open()

    if (dsBitfinex) {
      dsBitfinex.open()
    }

    api.open()
  }).catch((e) => {
    capture.exception(e)
  })
}

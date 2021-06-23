'use strict'

require('bfx-hf-util/lib/catch_uncaught_errors')

const HFDB = require('bfx-hf-models')
const HFDBLowDBAdapter = require('bfx-hf-models-adapter-lowdb')
const { schema: HFDBDummySchema } = require('bfx-hf-ext-plugin-dummy')

const { ALGO_LOG, ALGO_LOG_DIR } = process.env
const BitfinexExchangeClient = require('./lib/exchange_clients')[0]
const APIWSServer = require('./lib/ws_servers/api')
const HttpProxy = require('./lib/bfx_api_proxy')
const getMarketData = require('./lib/get_market_data')
const capture = require('./lib/capture')

const config = require('./config/algo_server.conf.json')

module.exports = async ({
  bfxRestURL,
  bfxWSURL,
  uiDBPath,
  algoDBPath,
  wsServerPort = 45000,
  httpProxyPort = 45001
}) => {
  const apiDB = new HFDB({
    schema: HFDBDummySchema,
    adapter: HFDBLowDBAdapter({ dbPath: uiDBPath })
  })

  const algoDB = new HFDB({
    schema: HFDBDummySchema,
    adapter: HFDBLowDBAdapter({ dbPath: algoDBPath })
  })

  const logAlgoOpts = {
    logAlgo: ALGO_LOG ? ALGO_LOG === 'true' : false,
    logAlgoDir: ALGO_LOG_DIR || ''
  }

  const api = new APIWSServer({
    algoDB,
    db: apiDB,
    port: wsServerPort,
    restURL: bfxRestURL,
    wsURL: bfxWSURL,
    algos: config.algos,
    logAlgoOpts,
    config
  })

  const proxy = new HttpProxy({
    restURL: bfxRestURL || 'https://api-pub.bitfinex.com',
    port: httpProxyPort
  })

  const opts = { wsURL: bfxWSURL, restURL: bfxRestURL }
  async function tryConnect () {
    try {
      const marketData = await getMarketData(BitfinexExchangeClient, opts)
      api.setMarketData(marketData)

      proxy.open()

      api.open()
    } catch (e) {
      capture.exception(e)
      setTimeout(tryConnect, 3000)
    }
  }

  await tryConnect()
}

'use strict'

require('bfx-hf-util/lib/catch_uncaught_errors')

const HFDB = require('bfx-hf-models')
const HFDBLowDBAdapter = require('bfx-hf-models-adapter-lowdb')
const { schema: HFDBDummySchema } = require('bfx-hf-ext-plugin-dummy')

const { ALGO_LOG, ALGO_LOG_DIR } = process.env
const APIWSServer = require('./lib/ws_servers/api')
const HttpProxy = require('./lib/bfx_api_proxy')
const getMarketData = require('./lib/get_market_data')
const capture = require('./lib/capture')

const config = require('./config/algo_server.conf.json')
const { RESTv2 } = require('bfx-api-node-rest')

module.exports = async ({
  bfxRestURL,
  bfxWSURL,
  bfxHostedWsUrl,
  uiDBPath,
  algoDBPath,
  strategyExecutionPath,
  dataDir,
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

  const strategyExecutionDB = new HFDB({
    schema: HFDBDummySchema,
    adapter: HFDBLowDBAdapter({ dbPath: strategyExecutionPath })
  })

  const logAlgoOpts = {
    logAlgo: ALGO_LOG ? ALGO_LOG === 'true' : false,
    logAlgoDir: ALGO_LOG_DIR || ''
  }

  const api = new APIWSServer({
    algoDB,
    db: apiDB,
    strategyExecutionDB,
    port: wsServerPort,
    restURL: bfxRestURL,
    wsURL: bfxWSURL,
    hostedURL: bfxHostedWsUrl,
    algos: config.algos,
    logAlgoOpts,
    config,
    dataDir
  })

  const proxy = new HttpProxy({
    restURL: bfxRestURL || 'https://api-pub.bitfinex.com',
    port: httpProxyPort
  })

  const rest = new RESTv2({
    url: bfxRestURL
  })

  async function tryConnect () {
    try {
      const marketData = await getMarketData(rest)
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

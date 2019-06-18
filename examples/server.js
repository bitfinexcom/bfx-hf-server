'use strict'

process.env.DEBUG = '*'

require('dotenv').config()
require('bfx-hf-util/lib/catch_uncaught_errors')

const HFDB = require('bfx-hf-models')
const HFDBLowDBAdapter = require('bfx-hf-models-adapter-lowdb')
const { schema: HFDBBitfinexSchema } = require('bfx-hf-ext-plugin-bitfinex')
const SocksProxyAgent = require('socks-proxy-agent')
const HFServer = require('../')

const {
  API_KEY, API_SECRET, PORT, DS_PORT, AS_PORT, TRANSFORM, DB_FILENAME,
  SOCKS_PROXY_URL, REST_URL, WS_URL,
} = process.env

const db = new HFDB({
  schema: HFDBBitfinexSchema,
  adapter: HFDBLowDBAdapter({
    dbPath: `${__dirname}/../${DB_FILENAME}`,
    schema: HFDBBitfinexSchema
  })
})

new HFServer({
  db,
  apiKey: API_KEY,
  apiSecret: API_SECRET,
  transform: !!TRANSFORM,
  asPort: AS_PORT,
  dsPort: DS_PORT,
  port: PORT,
  agent: SOCKS_PROXY_URL ? new SocksProxyAgent(SOCKS_PROXY_URL) : null,
  restURL: REST_URL,
  wsURL: WS_URL,
})
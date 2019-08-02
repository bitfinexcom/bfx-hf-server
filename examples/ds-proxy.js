'use strict'

process.env.DEBUG = '*'

require('dotenv').config()
require('bfx-hf-util/lib/catch_uncaught_errors')

const WS = require('ws')
const HFDB = require('bfx-hf-models')
const SocksProxyAgent = require('socks-proxy-agent')
const HFDBLowDBAdapter = require('bfx-hf-models-adapter-lowdb')
const debug = require('debug')('bfx:hf:server:examples:ds-proxy')
const { schema: HFDBBitfinexSchema } = require('bfx-hf-ext-plugin-bitfinex')

const HFServer = require('../')

const {
  API_KEY, API_SECRET, PORT, DS_PORT, AS_PORT, PROXY, TRANSFORM,
  SOCKS_PROXY_URL, REST_URL, WS_URL, DB_FILENAME,
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
  proxy: !!PROXY,
  asPort: +AS_PORT,
  dsPort: +DS_PORT,
  port: PORT,
  agent: SOCKS_PROXY_URL ? new SocksProxyAgent(SOCKS_PROXY_URL) : null,
  restURL: REST_URL,
  wsURL: WS_URL,
})

const ws = new WS(`ws://localhost:${PORT}`)

ws.on('error', (err) => {
  debug('socket error: %s', err.message)
})

ws.on('message', (msg) => {
  debug('recv message: %s', msg)
})

ws.on('close', () => {
  debug('socket closed')
})

ws.on('open', () => {
  debug('socket opened')

  setTimeout(() => {
    ws.send(JSON.stringify(['as', ['get.aos']]))
  }, 1000)
})

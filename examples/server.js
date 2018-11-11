'use strict'

process.env.DEBUG = '*'

require('dotenv').config()
require('bfx-hf-util/lib/catch_uncaught_errors')

const HFServer = require('../')
const { startDB, connectDB } = require('bfx-hf-models')
const SocksProxyAgent = require('socks-proxy-agent')

const {
  API_KEY, API_SECRET, PORT, DS_PORT, AS_PORT, PROXY, TRANSFORM,
  SOCKS_PROXY_URL, REST_URL, WS_URL
} = process.env

const run = async () => {
  await startDB(`${__dirname}/../db`)
  await connectDB('hf-server')

  const s = new HFServer({
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
}

try {
  run()
} catch (e) {
  debug('error: %s', e.message)
}

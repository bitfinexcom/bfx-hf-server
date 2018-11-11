'use strict'

process.env.DEBUG = '*'

require('dotenv').config()
require('bfx-hf-util/lib/catch_uncaught_errors')

const HFServer = require('../')
const debug = require('debug')('bfx:hf:server:examples:ds-proxy')
const WS = require('ws')
const SocksProxyAgent = require('socks-proxy-agent')
const { startDB, connectDB } = require('bfx-hf-models')

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
    proxy: !!PROXY,
    asPort: AS_PORT,
    dsPort: DS_PORT,
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
      ws.send(JSON.stringify(['ds', ['get.markets']]))
      ws.send(JSON.stringify(['as', ['get.aos']]))
    }, 1000)
  })
}

try {
  run()
} catch (e) {
  debug('error: %s', e.message)
}
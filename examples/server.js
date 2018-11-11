'use strict'

process.env.DEBUG = '*'

require('dotenv').config()
require('bfx-hf-util/lib/catch_uncaught_errors')

const HFServer = require('../')

const {
  API_KEY, API_SECRET, PORT, DS_PORT, AS_PORT, PROXY, TRANSFORM
} = process.env

const s = new HFServer({
  apiKey: API_KEY,
  apiSecret: API_SECRET,
  transform: !!TRANSFORM,
  proxy: !!PROXY,
  asPort: AS_PORT,
  dsPort: DS_PORT,
  port: PORT,
})

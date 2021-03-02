'use strict'

const HttpProxy = require('../lib/bfx_api_proxy')

const proxy = new HttpProxy({
  restURL: 'https://api-pub.bitfinex.com',
  port: 8080
})

proxy.open()

// curl localhost:8080/v2/candles/trade:1m:tBTCUSD/hist?limit=208&end=1613557500000

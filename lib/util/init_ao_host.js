'use strict'

const _isFunction = require('lodash/isFunction')
const { AOHost } = require('bfx-hf-algo')
const AOServer = require('bfx-hf-algo-server')

const {
  PingPong, Iceberg, TWAP, AccumulateDistribute, MACrossover, OCOCO
} = require('bfx-hf-algo')

const algoOrders = [
  PingPong, Iceberg, TWAP, AccumulateDistribute, MACrossover, OCOCO
]

module.exports = async ({ adapter, db, initCB }) => {
  const host = new AOHost({
    db,
    adapter,
    aos: algoOrders,
  })
  // added for communication with bitfinex webform
  const server = new AOServer({
    db,
    adapter,
    aos: null
  })
  server.setAlgoHost(host)

  if (_isFunction(initCB)) {
    await initCB(host)
  }

  host.connect()

  return host
}

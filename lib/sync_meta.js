'use strict'

const PI = require('p-iteration')
const debug = require('debug')('bfx:hf:server:sync-meta')

module.exports = async (db, exas) => {
  const { Market } = db

  return PI.forEach(exas, async (EXA) => {
    const { id } = EXA
    const exaClient = new EXA()

    debug('fetching market list for exa %s', id)
    const markets = await exaClient.getMarkets()
    debug('fetched %d markets for exa %s', markets.length, id)

    await Market.bulkInsert(markets.map(m => ({
      exchange: id,
      quote: m.q,
      base: m.b,
      wsID: m.w,
      restID: m.r,
      uiID: m.u,
      contexts: m.c
    })))
  })
}

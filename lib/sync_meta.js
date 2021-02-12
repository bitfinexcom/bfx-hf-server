'use strict'

const PI = require('p-iteration')
const debug = require('debug')('bfx:hf:server:sync-meta')

module.exports = async (db, exas, opts) => {
  const { Market } = db

  return PI.forEach(exas, async (EXA) => {
    const { id } = EXA
    const exaClient = new EXA(opts)

    debug('fetching market list for exa %s', id)
    const markets = await exaClient.getMarkets()
    debug('fetched %d markets for exa %s', markets.length, id)

    // remove markets before first so we dont duplicate
    await Market.rmAll()
    await Market.bulkInsert(markets.map(m => ({
      exchange: id,
      lev: m.l,
      quote: m.q,
      base: m.b,
      wsID: m.w,
      restID: m.r,
      uiID: m.u,
      contexts: m.c
    })))
  })
}

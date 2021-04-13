'use strict'

const debug = require('debug')('bfx:hf:server:sync-meta')

module.exports = async (db, EXA, opts) => {
  const { Market } = db

  const exaClient = new EXA(opts)

  debug('fetching market list')
  const markets = await exaClient.getMarkets()
  debug('fetched %d markets', markets.length)

  // remove markets before first so we dont duplicate
  await Market.rmAll()
  await Market.bulkInsert(markets.map(m => ({
    exchange: EXA.id,
    lev: m.l,
    quote: m.q,
    base: m.b,
    wsID: m.w,
    restID: m.r,
    uiID: m.u,
    contexts: m.c,
    p: m.p
  })))
}

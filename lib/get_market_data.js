'use strict'

const debug = require('debug')('bfx:hf:server:get-market-data')

module.exports = async (EXA, opts) => {
  const exaClient = new EXA(opts)

  debug('fetching market list')
  const markets = await exaClient.getMarkets()
  debug('fetched %d markets', markets.length)

  const formattedMarketMapArr = markets.map(m => {
    return [m.w, {
      exchange: EXA.id,
      lev: m.l,
      quote: m.q,
      base: m.b,
      wsID: m.w,
      restID: m.r,
      uiID: m.u,
      contexts: m.c,
      p: m.p,
      minSize: m.minSize,
      maxSize: m.maxSize
    }]
  })

  return new Map(formattedMarketMapArr)
}

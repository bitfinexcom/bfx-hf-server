'use strict'

const debug = require('debug')('bfx:hf:server:sync-meta')

module.exports = async (EXA, opts) => {
  const exaClient = new EXA(opts)

  debug('fetching market list')
  const markets = await exaClient.getMarkets()
  debug('fetched %d markets', markets.length)

  const formattedMarketMapArr = markets.reduce((acc, m) => {
    acc.push([m.w, {
      exchange: EXA.id,
      lev: m.l,
      quote: m.q,
      base: m.b,
      wsID: m.w,
      restID: m.r,
      uiID: m.u,
      contexts: m.c,
      p: m.p
    }])
    return acc
  }, [])

  return new Map(formattedMarketMapArr)
}

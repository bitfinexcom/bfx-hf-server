'use strict'

const debug = require('debug')('bfx:hf:server:get-market-data')
const { id: exchangeId } = require('./exchange_clients/bitfinex/index')
const getMarkets = require('./exchange_clients/bitfinex/get_markets')

module.exports = async (rest) => {
  debug('fetching market list')
  const markets = await getMarkets(rest)
  debug('fetched %d markets', markets.length)

  const formattedMarketMapArr = markets.map(m => {
    return [m.w, {
      exchange: exchangeId,
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

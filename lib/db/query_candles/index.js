'use strict'

const debug = require('debug')('bfx:hf:server:db:query-candles')

module.exports = async ({ ws, hfDS, exID, market, tf, start, end }) => {
  if (!hfDS) {
    debug('error: no data server for %s, can\'t fetch candles')
    return []
  }

  return hfDS.getCandles(ws, {
    symbol: market.restID,
    exID,
    tf,
    start,
    end
  }, market.uiID).then(() => {
    return null
  })
}

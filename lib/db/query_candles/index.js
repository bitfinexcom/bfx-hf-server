'use strict'

const debug = require('debug')('bfx:hf:server:db:query-candles')
// const fetchBitfinex = require('./fetch_bitfinex')
// const fetchBinance = require('./fetch_binance')

module.exports = async ({ ws, hfDS, exID, market, tf, start, end }) => {
  // const queryStart = Date.now()
  const candles = []

  debug('DEV NOTE: local candle cache disabled, DS fallback mandatory')

  /*
  if (exID === 'bitfinex') {
    candles = await fetchBitfinex({ market, tf, start, end })
  } else if (exID === 'binance') {
    candles = await fetchBinance({ market, tf, start, end })
  }
  */

  if (candles.length === 0) { // fall back to HF DS
    if (!hfDS) {
      return candles
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

  return candles
}

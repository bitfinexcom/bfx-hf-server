'use strict'

const capture = require('../../../capture')
const EXA = require('../../../exchange_clients/bitfinex')
const forEachMarketTF = require('../../../exchange_clients/for_each_market_tf')
const getFirstCandle = require('./get_first_candle')
const fetchLoop = require('./fetch_loop')

module.exports = async (db) => {
  return forEachMarketTF(db, EXA, async (market, tf) => {
    let firstCandle

    try {
      firstCandle = await getFirstCandle(market.restID, tf)
      await fetchLoop(firstCandle ? +firstCandle.mts : 0, market, tf)
    } catch (e) {
      capture.exception(e)
    }
  })
}

'use strict'

const PI = require('p-iteration')

module.exports = async (db, EXA, cb) => {
  const { Market } = db
  const markets = await Market.find([['exchange', '=', EXA.id]])
  const tfs = EXA.getCandleTimeFrames()

  await PI.forEachSeries(markets, async (market) => {
    await PI.forEachSeries(tfs, async (tf) => {
      return cb(market, tf)
    })
  })
}

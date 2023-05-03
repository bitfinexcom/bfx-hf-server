'use strict'

const isPaperPair = require('./is_paper_pair')

module.exports = (marketData) => {
  const marketValues = [...marketData.values()]

  const sandboxMarkets = {}
  const liveMarkets = {}

  marketValues.forEach((m) => {
    if (isPaperPair(m.wsID)) {
      sandboxMarkets[m.wsID] = m
    }
    if (m.p === 0) {
      liveMarkets[m.wsID] = m
    }
  })

  return {
    sandboxMarkets,
    liveMarkets
  }
}

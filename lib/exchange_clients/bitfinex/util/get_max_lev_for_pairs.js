'use strict'

const BN = require('bignumber.js')
BN.config({ DECIMAL_PLACES: 2 })

module.exports = (futureAndMarginConf) => {
  const [futureConf, marginConf] = futureAndMarginConf
  const confArr = []

  const futurePair = (futureConf && futureConf.initial) || {}
  const marginPair = (marginConf && marginConf.initial) || {}

  for (const key in futurePair) {
    confArr.push([key, new BN(1).dividedBy(futurePair[key]).toNumber()])
  }

  for (const key in marginPair) {
    confArr.push([key, new BN(1).dividedBy(marginPair[key]).toNumber()])
  }

  return new Map(confArr)
}

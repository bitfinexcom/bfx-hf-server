'use strict'

module.exports = (marketData, filterFunc) => {
  const marketValues = [...marketData.values()]

  return marketValues.filter(filterFunc)
}

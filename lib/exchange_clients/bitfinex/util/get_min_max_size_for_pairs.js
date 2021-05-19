'use strict'

module.exports = (pairInfoConfig) => {
  const [pairInfo, futurePairInfo] = pairInfoConfig
  const confArr = []

  pairInfo.forEach(pi => {
    const [key, [,,, minSize, maxSize]] = pi
    confArr.push([key, { minSize: +minSize, maxSize: +maxSize }])
  })

  futurePairInfo.forEach(pi => {
    const [key, [,,, minSize, maxSize]] = pi
    confArr.push([key, { minSize: +minSize, maxSize: +maxSize }])
  })

  return new Map(confArr)
}

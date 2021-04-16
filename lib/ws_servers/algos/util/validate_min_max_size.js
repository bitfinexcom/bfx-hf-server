'use strict'

const _isFinite = require('lodash/isFinite')

const getErrObject = (field, message) => {
  return { field, message }
}

module.exports = async (apiDB, payload) => {
  const { Market } = apiDB
  const { amount, sliceAmount, _symbol } = payload

  const [symbolDetail] = await Market.find([['wsID', '=', _symbol]])
  const { minSize, maxSize } = symbolDetail || {}

  if (_isFinite(amount)) {
    if (amount < minSize) return getErrObject('amount', `Minimum size is ${minSize}`)
    if (amount > maxSize) return getErrObject('amount', `Maximum size is ${maxSize}`)
  }

  if (_isFinite(sliceAmount)) {
    if (sliceAmount < minSize) return getErrObject('sliceAmount', `Minimum size is ${minSize}`)
    if (sliceAmount > maxSize) return getErrObject('sliceAmount', `Maximum size is ${maxSize}`)
  }

  return null
}

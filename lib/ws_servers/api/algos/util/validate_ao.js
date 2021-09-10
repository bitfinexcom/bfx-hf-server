'use strict'

const _isFunction = require('lodash/isFunction')

module.exports = (aoHost, marketData, aoID, payload) => {
  const ao = aoHost.getAO(aoID)

  if (!ao) {
    return `Unknown algo order ID: ${aoID}`
  }

  const { meta = {} } = ao
  const { validateParams, processParams } = meta

  if (!_isFunction(validateParams)) {
    return null
  }

  const { _symbol } = payload

  const symbolDetail = marketData.get(_symbol)

  const params = _isFunction(processParams)
    ? processParams(payload)
    : { ...payload }

  return validateParams(params, symbolDetail)
}

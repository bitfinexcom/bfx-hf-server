'use strict'

const _isFunction = require('lodash/isFunction')
const { apply } = require('../../../../util/i18n')

module.exports = (aoHost, marketData, aoID, payload) => {
  const ao = aoHost.getAO(aoID)

  if (!ao) {
    return {
      message: `Unknown algo order ID: ${aoID}`,
      i18n: apply(['unknownAlgoOrderId', { aoID }])
    }
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

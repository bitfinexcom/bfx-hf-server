'use strict'

const _isFunction = require('lodash/isFunction')

module.exports = (aoHost, aoID, payload) => {
  const ao = aoHost.getAO(aoID)

  if (!ao) {
    return `Unknown algo order ID: ${aoID}`
  }

  const { meta = {} } = ao
  const { validateParams, processParams } = meta

  if (!_isFunction(validateParams)) {
    return null
  }

  const params = _isFunction(processParams)
    ? processParams(payload)
    : { ...payload }

  const err = validateParams(params)
  if (err) {
    return err
  }

  return null
}

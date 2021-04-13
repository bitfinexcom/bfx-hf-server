'use strict'

const _isFunction = require('lodash/isFunction')
const _isString = require('lodash/isString')

module.exports = (aoHost, aoID, payload) => {
  const ao = aoHost.getAO(aoID)

  if (!ao) {
    return `Unknown algo order ID: ${aoID}`
  }

  const { meta = {} } = ao
  const { validateParams, processParams } = meta

  const params = _isFunction(processParams)
    ? processParams(payload)
    : { ...payload }

  if (_isFunction(validateParams)) {
    const err = validateParams(params)

    if (err) {
      return _isString(err) ? err : err.message
    }
  }

  return null
}

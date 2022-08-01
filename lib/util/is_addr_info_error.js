'use strict'

const _isString = require('lodash/isString')

module.exports = (errMsg = '') => {
  if (!_isString(errMsg)) {
    return false
  }
  return errMsg.includes('EAI_AGAIN')
}

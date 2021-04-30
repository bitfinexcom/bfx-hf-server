'use strict'

const _isArray = require('lodash/isArray')
const recvData = require('./data')

module.exports = (exa, msg) => {
  if (_isArray(msg)) {
    recvData(exa, msg)
  }
}

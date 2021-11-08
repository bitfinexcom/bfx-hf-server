'use strict'

const _isBoolean = require('lodash/isBoolean')
const _isArray = require('lodash/isArray')
const _isObject = require('lodash/isObject')
const _isString = require('lodash/isString')
const _isFinite = require('lodash/isFinite')
const _isEmpty = require('lodash/isEmpty')
const sendError = require('./send_error')

const validators = {
  enum: ([valid, v]) => _isArray(valid) && valid.indexOf(v) > -1,
  array: v => _isArray(v),
  object: v => _isObject(v) && !_isEmpty(v),
  string: v => _isString(v) && !_isEmpty(v),
  number: _isFinite,
  bool: _isBoolean
}

module.exports = (ws, params) => {
  const paramNames = Object.keys(params)
  let param

  for (let i = 0; i < paramNames.length; i += 1) {
    param = params[paramNames[i]]

    if (!validators[param.type]) {
      throw new Error(`invalid param type: ${param.type}`)
    }

    if (!validators[param.type](param.v)) {
      sendError(ws, `invalid parameter: ${paramNames[i]}`)
      return false
    }
  }

  return true
}

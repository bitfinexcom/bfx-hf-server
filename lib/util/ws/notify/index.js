'use strict'

const notifyInfo = require('./info')
const notifyError = require('./error')
const notifySuccess = require('./success')
const notifyErrorBitfinex = require('./error_bitfinex')
const notifyOrderExecuted = require('./order_executed')
const notifyOrderModified = require('./order_modified')
const notifyOrderCancelled = require('./order_cancelled')
const notifyOrderPartiallyFilled = require('./order_partially_filled')
const notifyOrderSubmitted = require('./order_submitted')
const notifyInternalError = require('./internal_error')

module.exports = {
  notifyInfo,
  notifyError,
  notifySuccess,
  notifyErrorBitfinex,
  notifyOrderExecuted,
  notifyOrderModified,
  notifyOrderCancelled,
  notifyOrderPartiallyFilled,
  notifyOrderSubmitted,
  notifyInternalError
}

'use strict'

const _last = require('lodash/last')
const _isArray = require('lodash/isArray')
const candleTransformer = require('../../transformers/candle')

module.exports = (exa, msg, channel) => {
  if (_isArray(_last(msg)[0])) {
    return [candleTransformer(_last(_last(msg)))]
    // return _last(msg).map(candleTransformer)
  }

  return [candleTransformer(_last(msg))]
}

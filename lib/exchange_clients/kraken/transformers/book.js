'use strict'

const _flatten = require('lodash/flatten')
const _reverse = require('lodash/reverse')

module.exports = (book = {}) => {
  const { bids, asks } = book

  return _flatten([
    _reverse(asks.map(a => ([a[0], -1 * a[1]]))),
    bids
  ]).map(pl => ([pl[0], pl[1]]))
}

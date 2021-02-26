'use strict'

const auth = require('./auth')
const book = require('./book')
const ticker = require('./ticker')
const trades = require('./trades')

module.exports = {
  auth,
  book,
  ticker,
  trades
}

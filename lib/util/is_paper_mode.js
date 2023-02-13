'use strict'

const { PAPER_MODE_PAIRS } = require('../constants')

/**
 * Checks if a symbol is a paper mode symbol
 *
 * @param symbol
 * @returns {boolean}
 */
module.exports = (symbol) => {
  return PAPER_MODE_PAIRS.includes(symbol)
}

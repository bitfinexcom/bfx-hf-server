'use strict'

const { PAPER_PAIR_PREFIX } = require('../constants')

/**
 * Checks if a symbol is a paper mode symbol
 *
 * @param symbol
 * @returns {boolean}
 */
module.exports = (symbol) => {
  return symbol?.includes(PAPER_PAIR_PREFIX)
}
